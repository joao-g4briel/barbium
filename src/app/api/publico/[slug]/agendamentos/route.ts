import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { horariosLivres } from "@/lib/agenda";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import { criarPagamentoPix } from "@/lib/mercadopago";
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
  nome: z.string().min(2, "Informe seu nome."),
  telefone: z.string().min(8, "Informe um telefone válido."),
});

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
  if (!barbearia || !barbearia.ativo) {
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

  const inicio = new Date(dados.data.inicio);
  if (inicio.getTime() < Date.now()) {
    return NextResponse.json({ erro: "Esse horário já passou." }, { status: 400 });
  }
  const fim = new Date(inicio.getTime() + servico.duracaoMinutos * 60 * 1000);

  const telefoneNormalizado = dados.data.telefone.replace(/\D/g, "");
  if (telefoneNormalizado.length < 8) {
    return NextResponse.json({ erro: "Informe um telefone válido." }, { status: 400 });
  }

  // Confere se esse horário respeita o expediente do profissional (dia,
  // horário, almoço) e não cai em cima de um bloqueio — reaproveita a
  // mesma função que gera a lista de horários oferecidos, pra não ter
  // duas regras de negócio diferentes que podem se desalinhar.
  const inicioDoDia = inicioDoDiaBrasil(inicio);
  const disponiveis = await horariosLivres({
    barbeariaId: barbearia.id,
    profissionalId: profissional.id,
    data: inicioDoDia,
    duracaoMinutos: servico.duracaoMinutos,
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
  const sinal = await obterSinalPublico(barbearia.id);
  const sinalValor = sinal ? calcularSinal(Number(servico.preco), sinal.percentual) : null;
  const sinalExpiraEm = sinal ? new Date(Date.now() + SINAL_RESERVA_MINUTOS * 60 * 1000) : null;

  let agendamento;
  try {
    agendamento = await prisma.$transaction(async (tx) => {
      // Confere de novo, dentro da transação, se ninguém pegou esse
      // horário entre o momento em que a lista foi carregada e agora —
      // é a proteção contra dois clientes confirmarem o mesmo horário.
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

      const cliente = await tx.cliente.upsert({
        where: {
          barbeariaId_telefone: { barbeariaId: barbearia.id, telefone: telefoneNormalizado },
        },
        update: { nome: dados.data.nome },
        create: {
          nome: dados.data.nome,
          telefone: telefoneNormalizado,
          barbeariaId: barbearia.id,
        },
      });

      return tx.agendamento.create({
        data: {
          inicio,
          fim,
          status: sinal ? "AGUARDANDO_PAGAMENTO" : "CONFIRMADO",
          barbeariaId: barbearia.id,
          clienteId: cliente.id,
          servicoId: servico.id,
          barbeiroId: profissional.id,
          ...(sinal ? { sinalValor, sinalStatus: "PENDENTE" as const, sinalExpiraEm } : {}),
        },
      });
    });
  } catch (erro) {
    if (erro instanceof Error && erro.message === "HORARIO_INDISPONIVEL") {
      return NextResponse.json(
        { erro: "Esse horário acabou de ser preenchido. Escolha outro." },
        { status: 409 },
      );
    }
    throw erro;
  }

  if (!sinal || sinalValor === null || sinalExpiraEm === null) {
    return NextResponse.json({ agendamento });
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
      pagamento: {
        valor: sinalValor,
        expiraEm: sinalExpiraEm.toISOString(),
        qrCode: dadosPix.qr_code,
        qrCodeBase64: dadosPix.qr_code_base64 ?? null,
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
