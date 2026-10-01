import { NextResponse } from "next/server";
import { z } from "zod";
import type { Agendamento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { formatarHora } from "@/lib/formatar";
import { cancelarPixPendente } from "@/lib/sinal";

const corpoSchema = z.union([
  z.object({ servicoId: z.string().min(1) }),
  z.object({ status: z.enum(["CONFIRMADO", "CONCLUIDO", "CANCELADO", "FALTA"]) }),
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
    include: { servico: true },
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

  const { status } = dados.data;

  // Esperando o Pix: a barbearia pode confirmar sem sinal ou cancelar.
  if (agendamento.status === "AGUARDANDO_PAGAMENTO" && status !== "CONFIRMADO" && status !== "CANCELADO") {
    return NextResponse.json(
      { erro: "Esse agendamento ainda espera o Pix do sinal. Confirme sem sinal ou cancele." },
      { status: 409 },
    );
  }

  // Qualquer decisão da barbearia encerra um Pix ainda pendente. Se ele for
  // pago mesmo assim, o webhook registra o pagamento sem mexer no status.
  const encerraSinalPendente = agendamento.sinalStatus === "PENDENTE";
  if (encerraSinalPendente) await cancelarPixPendente(agendamento);

  const atualizado = await prisma.agendamento.update({
    where: { id },
    data: { status, ...(encerraSinalPendente ? { sinalStatus: null, sinalExpiraEm: null } : {}) },
  });

  if (status === "CONCLUIDO") {
    // Lança automaticamente no caixa — idempotente: se já existir um
    // lançamento pra esse agendamento, não duplica.
    await prisma.caixaLancamento.upsert({
      where: { agendamentoId: id },
      update: {},
      create: {
        tipo: "ENTRADA",
        valor: agendamento.servico.preco,
        descricao: agendamento.servico.nome,
        barbeariaId: agendamento.barbeariaId,
        agendamentoId: id,
      },
    });
  } else {
    // Se voltou de CONCLUIDO pra outro status (correção de erro), desfaz
    // o lançamento de caixa que tinha sido criado.
    await prisma.caixaLancamento.deleteMany({ where: { agendamentoId: id } });
  }

  return NextResponse.json({ agendamento: atualizado });
}

// Corrige o serviço escolhido pelo cliente. O início fica igual e o término
// acompanha a duração do novo serviço. Em agendamento concluído o valor já
// lançado no caixa é corrigido junto, e o horário não é conferido porque o
// atendimento já aconteceu.
async function trocarServico(agendamento: Agendamento, servicoId: string) {
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

      if (agendamento.status === "CONCLUIDO") {
        await tx.caixaLancamento.upsert({
          where: { agendamentoId: agendamento.id },
          update: { valor: servico.preco, descricao: servico.nome },
          create: {
            tipo: "ENTRADA",
            valor: servico.preco,
            descricao: servico.nome,
            barbeariaId: agendamento.barbeariaId,
            agendamentoId: agendamento.id,
          },
        });
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
