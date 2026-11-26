import { NextResponse } from "next/server";
import { obterChavePix, pixPelaChave } from "@/lib/pix-chave";
import { acessoVencido } from "@/lib/acesso";
import { AUTOR_CLIENTE_AGENDAMENTO, registrarHistorico } from "@/lib/historico";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { horariosLivres } from "@/lib/agenda";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import { motivoForaDasRegras, primeiroHorarioAceito } from "@/lib/pagina-agendamento";
import { criarPagamentoPix } from "@/lib/mercadopago";
import { ehConflitoDeHorario } from "@/lib/conflito-horario";
import { obterOuCriarCliente } from "@/lib/cliente-por-telefone";
import { notificarAgendamento } from "@/lib/notificacoes";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao } from "@/lib/limite-tentativas";
import { codigoDoAgendamento } from "@/lib/link-cliente";
import { assinaturaDoCliente, travarCliente, usosNoMes } from "@/lib/planos-corte";
import { mesDoPlano, motivoParaNaoUsarPlano, situacaoAssinatura } from "@/lib/planos-corte-regras";
import {
  SINAL_RESERVA_MINUTOS,
  calcularSinal,
  emailPagadorSinal,
  obterSinalPublico,
  obterTokenMercadoPago,
} from "@/lib/sinal";

const corpoSchema = z.object({
  servicoId: z.string().min(1),
  profissionalId: z.string().min(1),
  inicio: z.string().datetime(),
  // Assinante do plano de corte já é cliente: o nome vem do cadastro.
  nome: z.string().trim().optional(),
  telefone: z.string().min(8, "Informe um telefone válido."),
  usarPlano: z.boolean().optional(),
});

class ErroPlano extends Error {}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const corpo = await request.json().catch(() => null);
  const dados = corpoSchema.safeParse(corpo);

  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const barbearia = await prisma.barbearia.findUnique({ where: { slug } });
  if (!barbearia || !barbearia.ativo || acessoVencido(barbearia)) {
    return NextResponse.json({ erro: "Barbearia não encontrada." }, { status: 404 });
  }

  const servico = await prisma.servico.findUnique({ where: { id: dados.data.servicoId } });
  if (!servico || servico.barbeariaId !== barbearia.id || !servico.ativo) {
    return NextResponse.json({ erro: "Serviço não encontrado." }, { status: 404 });
  }

  const profissional = await prisma.usuario.findUnique({
    where: { id: dados.data.profissionalId },
  });
  if (
    !profissional ||
    profissional.barbeariaId !== barbearia.id ||
    !profissional.ativo ||
    (profissional.role !== "DONO" && profissional.role !== "BARBEIRO")
  ) {
    return NextResponse.json({ erro: "Profissional não encontrado." }, { status: 404 });
  }

  const usarPlano = dados.data.usarPlano === true;
  if (!usarPlano && (dados.data.nome ?? "").length < 2) {
    return NextResponse.json({ erro: "Informe seu nome." }, { status: 400 });
  }

  const inicio = new Date(dados.data.inicio);
  const foraDasRegras = motivoForaDasRegras(
    inicio,
    inicioDoDiaBrasil(inicio, barbearia.fuso),
    inicioDoDiaBrasil(new Date(), barbearia.fuso),
    barbearia,
  );
  if (foraDasRegras) return NextResponse.json({ erro: foraDasRegras }, { status: 400 });
  const fim = new Date(inicio.getTime() + servico.duracaoMinutos * 60 * 1000);

  const telefoneNormalizado = dados.data.telefone.replace(/\D/g, "");
  if (telefoneNormalizado.length < 8) {
    return NextResponse.json({ erro: "Informe um telefone válido." }, { status: 400 });
  }

  // Link público sem login: sem freio, dá pra encher a agenda de reservas
  // falsas (e, com sinal, segurar horários até o Pix expirar).
  const permitido = await dentroDosLimites([
    { chave: `agendar:ip:${ipDaRequisicao(request)}`, maximo: 10, janelaSegundos: 60 * 60 },
    { chave: `agendar:tel:${barbearia.id}:${telefoneNormalizado}`, maximo: 5, janelaSegundos: 24 * 60 * 60 },
  ]);
  if (!permitido) return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });

  // Confere se esse horário respeita o expediente do profissional (dia,
  // horário, almoço) e não cai em cima de um bloqueio — reaproveita a
  // mesma função que gera a lista de horários oferecidos, pra não ter
  // duas regras de negócio diferentes que podem se desalinhar.
  const inicioDoDia = inicioDoDiaBrasil(inicio, barbearia.fuso);
  const disponiveis = await horariosLivres({
    barbeariaId: barbearia.id,
    profissionalId: profissional.id,
    data: inicioDoDia,
    fuso: barbearia.fuso,
    duracaoMinutos: servico.duracaoMinutos,
    aceitarDesde: primeiroHorarioAceito(barbearia),
  });
  const aindaDisponivel = disponiveis.some((h) => h.getTime() === inicio.getTime());
  if (!aindaDisponivel) {
    return NextResponse.json(
      { erro: "Esse horário não está mais disponível. Escolha outro." },
      { status: 409 },
    );
  }

  // Com sinal ativo, o agendamento nasce aguardando o Pix e só vira
  // confirmado quando o Mercado Pago aprovar o pagamento.
  // Pelo plano de corte não há sinal: o mês já foi pago.
  const sinal = usarPlano ? null : await obterSinalPublico(barbearia.id);
  const sinalValor = sinal ? calcularSinal(Number(servico.preco), sinal.percentual) : null;
  const sinalExpiraEm = sinal ? new Date(Date.now() + SINAL_RESERVA_MINUTOS * 60 * 1000) : null;

  let agendamento;
  try {
    agendamento = await prisma.$transaction(async (tx) => {
      // Confere de novo, dentro da transação, se ninguém pegou esse
      // horário entre o momento em que a lista foi carregada e agora. Dois
      // pedidos exatamente juntos ainda passam por aqui; esses o banco recusa
      // (ver ehConflitoDeHorario).
      const conflito = await tx.agendamento.findFirst({
        where: {
          barbeariaId: barbearia.id,
          barbeiroId: profissional.id,
          status: { not: "CANCELADO" },
          inicio: { lt: fim },
          fim: { gt: inicio },
        },
      });

      if (conflito) {
        throw new Error("HORARIO_INDISPONIVEL");
      }

      let assinaturaId: string | null = null;
      let cliente;
      if (usarPlano) {
        cliente = await tx.cliente.findUnique({
          where: { barbeariaId_telefone: { barbeariaId: barbearia.id, telefone: telefoneNormalizado } },
        });
        if (!cliente || cliente.removidoEm) throw new ErroPlano("Não encontramos um plano para esse WhatsApp.");
        // Um pedido de cada vez por cliente: o limite do mês não estoura com
        // dois agendamentos feitos juntos.
        await travarCliente(tx, cliente.id);
        const assinatura = await assinaturaDoCliente(tx, cliente.id);
        if (!assinatura) throw new ErroPlano("Não encontramos um plano para esse WhatsApp.");
        const mes = assinatura.validaAte ? mesDoPlano(assinatura.validaAte, inicio) : null;
        const motivo = motivoParaNaoUsarPlano({
          situacao: situacaoAssinatura(assinatura),
          validaAte: assinatura.validaAte,
          servicoNoPlano: assinatura.plano.servicos.some((s) => s.servicoId === servico.id),
          inicio,
          usosPorMes: assinatura.plano.usosPorMes,
          usosNoMes: mes ? await usosNoMes(tx, assinatura.id, mes) : 0,
        });
        if (motivo) throw new ErroPlano(motivo);
        assinaturaId = assinatura.id;
      } else {
        // Telefone já cadastrado: mantém o nome que a barbearia conhece. Senão
        // qualquer um renomeia um cliente só digitando o telefone dele.
        cliente = await obterOuCriarCliente(tx, {
          barbeariaId: barbearia.id,
          telefone: telefoneNormalizado,
          nome: dados.data.nome ?? "",
        });
      }

      const criado = await tx.agendamento.create({
        data: {
          inicio,
          fim,
          status: sinal ? "AGUARDANDO_PAGAMENTO" : "CONFIRMADO",
          barbeariaId: barbearia.id,
          clienteId: cliente.id,
          servicoId: servico.id,
          barbeiroId: profissional.id,
          assinaturaId,
          ...(sinal
            ? { sinalValor, sinalStatus: "PENDENTE" as const, sinalExpiraEm, sinalViaChave: sinal.metodo === "chave" }
            : {}),
        },
      });
      await registrarHistorico(tx, criado.id, AUTOR_CLIENTE_AGENDAMENTO, { acao: "CRIADO", statusPara: criado.status });
      return criado;
    });
  } catch (erro) {
    if (erro instanceof ErroPlano) return NextResponse.json({ erro: erro.message }, { status: 409 });
    if ((erro instanceof Error && erro.message === "HORARIO_INDISPONIVEL") || ehConflitoDeHorario(erro)) {
      return NextResponse.json(
        { erro: "Esse horário acabou de ser preenchido. Escolha outro." },
        { status: 409 },
      );
    }
    throw erro;
  }

  if (!sinal || sinalValor === null || sinalExpiraEm === null) {
    notificarAgendamento("agendamento.confirmado", agendamento.id);
    return NextResponse.json({
      agendamento: { id: agendamento.id, status: agendamento.status },
      codigo: codigoDoAgendamento(agendamento.id),
    });
  }

  // Pix pela chave da barbearia: o código é montado aqui, com o valor certo.
  // Sem confirmação automática: o cliente avisa que pagou e o dono confere.
  if (sinal.metodo === "chave") {
    try {
      const chave = await obterChavePix(barbearia.id);
      if (!chave) throw new Error("Sem chave Pix.");
      const pix = await pixPelaChave({
        chave,
        barbeariaNome: barbearia.nome,
        valor: sinalValor,
        txid: agendamento.id,
        descricao: `Sinal ${servico.nome}`,
      });
      return NextResponse.json({
        agendamento: { id: agendamento.id, status: agendamento.status },
        codigo: codigoDoAgendamento(agendamento.id),
        pagamento: { valor: sinalValor, expiraEm: sinalExpiraEm.toISOString(), viaChave: true, ...pix },
      });
    } catch (erro) {
      console.error("Falha ao gerar Pix pela chave:", erro instanceof Error ? erro.message : erro);
      await prisma.agendamento.update({
        where: { id: agendamento.id },
        data: { status: "CANCELADO", sinalStatus: null, sinalExpiraEm: null },
      });
      return NextResponse.json(
        { erro: "Não foi possível gerar o Pix do sinal agora. Tente de novo em instantes." },
        { status: 502 },
      );
    }
  }

  try {
    const token = await obterTokenMercadoPago(barbearia.id);
    if (!token) throw new Error("Sem token do Mercado Pago.");
    // O Mercado Pago só entrega webhook em URL pública https; em ambiente
    // local a confirmação vem pela consulta que a página de pagamento faz.
    const origem = new URL(request.url).origin;
    const pagamento = await criarPagamentoPix(token, {
      valor: sinalValor,
      descricao: `Sinal · ${servico.nome} · ${barbearia.nome}`,
      referencia: agendamento.id,
      emailPagador: emailPagadorSinal(agendamento.id),
      expiraEm: sinalExpiraEm,
      urlNotificacao: origem.startsWith("https://") ? `${origem}/api/mercadopago/webhook/${barbearia.id}` : null,
    });
    const dadosPix = pagamento.point_of_interaction?.transaction_data;
    if (!dadosPix?.qr_code) throw new Error("Pix sem código.");

    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: { sinalPagamentoId: String(pagamento.id) },
    });

    return NextResponse.json({
      agendamento: { id: agendamento.id, status: agendamento.status },
      codigo: codigoDoAgendamento(agendamento.id),
      pagamento: {
        valor: sinalValor,
        expiraEm: sinalExpiraEm.toISOString(),
        qrCode: dadosPix.qr_code,
        qrCodeBase64: dadosPix.qr_code_base64 ?? null,
        viaChave: false,
      },
    });
  } catch (erro) {
    // Sem Pix não há como garantir o horário: libera na hora.
    console.error("Falha ao gerar Pix do sinal:", erro instanceof Error ? erro.message : erro);
    await prisma.agendamento.update({
      where: { id: agendamento.id },
      data: { status: "CANCELADO", sinalStatus: null, sinalExpiraEm: null },
    });
    return NextResponse.json(
      { erro: "Não foi possível gerar o Pix do sinal agora. Tente de novo em instantes." },
      { status: 502 },
    );
  }
}
