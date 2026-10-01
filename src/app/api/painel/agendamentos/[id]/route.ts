import { NextResponse } from "next/server";
import { z } from "zod";
import type { Agendamento, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { formatarHora } from "@/lib/formatar";
import { cancelarPixPendente } from "@/lib/sinal";
import {
  desfazerConclusao,
  registrarConclusao,
  registrarSinalDevolvido,
  restanteAReceber,
} from "@/lib/caixa-agendamento";

const corpoSchema = z.union([
  z.object({ servicoId: z.string().min(1) }),
  z.object({
    status: z.enum(["CONFIRMADO", "CONCLUIDO", "CANCELADO", "FALTA"]),
    formaPagamento: z.enum(["PIX", "DINHEIRO", "DEBITO", "CREDITO"]).optional(),
  }),
  z.object({ acao: z.literal("sinal-devolvido") }),
]);

class ErroTroca extends Error {}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  const corpo = await request.json().catch(() => null);
  const dados = corpoSchema.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { servico: true, barbeiro: { select: { comissaoPercentual: true } } },
  });

  if (!agendamento || agendamento.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Agendamento não encontrado." }, { status: 404 });
  }

  // Barbeiro só mexe nos próprios agendamentos — dono mexe em qualquer um.
  if (sessao.role === "BARBEIRO" && agendamento.barbeiroId !== sessao.sub) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }

  if ("servicoId" in dados.data) {
    return trocarServico(agendamento, dados.data.servicoId);
  }

  if ("acao" in dados.data) {
    return marcarSinalDevolvido(agendamento, sessao.role);
  }

  const { status, formaPagamento } = dados.data;

  // Esperando o Pix: a barbearia pode confirmar sem sinal ou cancelar.
  if (agendamento.status === "AGUARDANDO_PAGAMENTO" && status !== "CONFIRMADO" && status !== "CANCELADO") {
    return NextResponse.json(
      { erro: "Esse agendamento ainda espera o Pix do sinal. Confirme sem sinal ou cancele." },
      { status: 409 },
    );
  }

  // Qualquer decisão da barbearia encerra um Pix ainda pendente. Se ele for
  // pago mesmo assim, o webhook registra o pagamento sem mexer no status.
  // Concluir com valor a receber exige saber como o cliente pagou.
  if (status === "CONCLUIDO" && !formaPagamento) {
    const restante = await restanteAReceber(prisma, id, Number(agendamento.servico.preco));
    if (restante > 0) {
      return NextResponse.json(
        { erro: "Escolha a forma de pagamento.", codigo: "FORMA_PAGAMENTO" },
        { status: 400 },
      );
    }
  }

  const encerraSinalPendente = agendamento.sinalStatus === "PENDENTE";
  if (encerraSinalPendente) await cancelarPixPendente(agendamento);

  const atualizado = await prisma.$transaction(async (tx) => {
    const resultado = await tx.agendamento.update({
      where: { id },
      data: { status, ...(encerraSinalPendente ? { sinalStatus: null, sinalExpiraEm: null } : {}) },
    });
    // Concluir lança o restante no caixa e guarda a comissão; sair de
    // concluído desfaz os dois. O sinal pago fica no caixa até ser devolvido.
    if (status === "CONCLUIDO") await registrarConclusao(tx, agendamento, formaPagamento ?? null);
    else if (agendamento.status === "CONCLUIDO") await desfazerConclusao(tx, id);
    return resultado;
  });

  return NextResponse.json({ agendamento: atualizado });
}

// A barbearia devolveu o sinal pelo Mercado Pago (o reembolso em si é feito
// lá): registra aqui pra a entrada sair do caixa. Só em agendamento que não
// aconteceu, e só o dono mexe em dinheiro.
async function marcarSinalDevolvido(agendamento: Agendamento, papel: string) {
  if (papel !== "DONO") {
    return NextResponse.json({ erro: "Só o dono pode registrar a devolução do sinal." }, { status: 403 });
  }
  if (agendamento.sinalStatus !== "PAGO" || agendamento.sinalDevolvidoEm) {
    return NextResponse.json({ erro: "Não há sinal pago a devolver neste agendamento." }, { status: 409 });
  }
  if (agendamento.status !== "CANCELADO" && agendamento.status !== "FALTA") {
    return NextResponse.json(
      { erro: "Cancele o agendamento antes de registrar a devolução do sinal." },
      { status: 409 },
    );
  }
  await prisma.$transaction((tx) => registrarSinalDevolvido(tx, agendamento.id));
  return NextResponse.json({ ok: true });
}

// Corrige o serviço escolhido pelo cliente. O início fica igual e o término
// acompanha a duração do novo serviço. Em agendamento concluído o valor já
// lançado no caixa é corrigido junto, e o horário não é conferido porque o
// atendimento já aconteceu.
async function trocarServico(
  agendamento: Agendamento & { barbeiro: { comissaoPercentual: Prisma.Decimal | null } },
  servicoId: string,
) {
  if (agendamento.status !== "CONFIRMADO" && agendamento.status !== "CONCLUIDO") {
    return NextResponse.json(
      { erro: "Só dá para trocar o serviço de agendamentos confirmados ou concluídos." },
      { status: 409 },
    );
  }

  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico || servico.barbeariaId !== agendamento.barbeariaId || !servico.ativo) {
    return NextResponse.json({ erro: "Serviço não encontrado." }, { status: 404 });
  }

  if (servico.id === agendamento.servicoId) {
    return NextResponse.json({ erro: "Esse já é o serviço do agendamento." }, { status: 400 });
  }

  const novoFim = new Date(agendamento.inicio.getTime() + servico.duracaoMinutos * 60 * 1000);

  try {
    const atualizado = await prisma.$transaction(async (tx) => {
      // Só o tempo a mais precisa estar livre: encurtar nunca invade ninguém,
      // e o trecho que o atendimento já ocupava continua sendo dele.
      if (agendamento.status === "CONFIRMADO" && novoFim > agendamento.fim) {
        const conflito = await tx.agendamento.findFirst({
          where: {
            barbeariaId: agendamento.barbeariaId,
            barbeiroId: agendamento.barbeiroId,
            id: { not: agendamento.id },
            status: { not: "CANCELADO" },
            inicio: { lt: novoFim },
            fim: { gt: agendamento.fim },
          },
          orderBy: { inicio: "asc" },
          include: { cliente: { select: { nome: true } } },
        });
        if (conflito) {
          throw new ErroTroca(
            `O novo serviço termina às ${formatarHora(novoFim)} e invade o horário de ${conflito.cliente.nome}, às ${formatarHora(conflito.inicio)}.`,
          );
        }

        // Folgas e férias contam. A trava de emergência (sem data de fim) só
        // impede agendamentos novos, não ajuste nos que já existem.
        const folga = await tx.bloqueioAgenda.findFirst({
          where: {
            usuarioId: agendamento.barbeiroId,
            inicio: { lt: novoFim },
            fim: { not: null, gt: agendamento.fim },
          },
        });
        if (folga) {
          throw new ErroTroca(
            `O novo serviço termina às ${formatarHora(novoFim)} e invade uma folga marcada na agenda.`,
          );
        }
      }

      const resultado = await tx.agendamento.update({
        where: { id: agendamento.id },
        data: { servicoId: servico.id, fim: novoFim },
      });

      // Concluído: refaz o restante no caixa (mantendo a forma de pagamento)
      // e a comissão, agora pelo serviço novo.
      if (agendamento.status === "CONCLUIDO") {
        const anterior = await tx.caixaLancamento.findUnique({
          where: { agendamentoId_origem: { agendamentoId: agendamento.id, origem: "ATENDIMENTO" } },
          select: { formaPagamento: true },
        });
        await registrarConclusao(
          tx,
          { id: agendamento.id, barbeariaId: agendamento.barbeariaId, servico, barbeiro: agendamento.barbeiro },
          anterior?.formaPagamento ?? null,
        );
      }

      return resultado;
    });

    return NextResponse.json({ agendamento: atualizado });
  } catch (erro) {
    if (erro instanceof ErroTroca) {
      return NextResponse.json({ erro: erro.message }, { status: 409 });
    }
    throw erro;
  }
}
