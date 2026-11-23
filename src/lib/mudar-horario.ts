import "server-only";
import type { Agendamento } from "@prisma/client";
import { prisma } from "./prisma";
import { horariosLivres } from "./agenda";
import { inicioDoDiaBrasil } from "./fuso-brasil";
import { ehConflitoDeHorario } from "./conflito-horario";
import { dentroDaJanelaDeLembrete } from "./lembrete-opcoes";

// Muda o dia, o horário e/ou o profissional de um agendamento confirmado.
// Usado pelo painel (equipe) e pelo link do cliente. Mesmas regras de um
// agendamento novo (expediente, almoço, folgas, conflito), mas o lugar que o
// agendamento ocupa hoje conta como livre. Mantém duração, sinal e cliente.
//
// Quem chama confere permissão e o profissional; aqui ficam as regras da agenda.

export type ResultadoMudanca =
  | { ok: true; agendamento: Agendamento }
  | { ok: false; erro: string; status: 400 | 409 };

class HorarioOcupado extends Error {}

export async function mudarHorario(
  agendamento: Agendamento,
  inicio: Date,
  profissionalId: string,
  grade: { passoMinutos?: number; aceitarDesde?: Date } = {},
): Promise<ResultadoMudanca> {
  if (agendamento.status !== "CONFIRMADO") {
    return { ok: false, erro: "Só dá para mudar o horário de agendamentos confirmados.", status: 409 };
  }
  if (inicio.getTime() === agendamento.inicio.getTime() && profissionalId === agendamento.barbeiroId) {
    return { ok: false, erro: "Esse já é o horário do agendamento.", status: 400 };
  }

  const duracaoMinutos = Math.round((agendamento.fim.getTime() - agendamento.inicio.getTime()) / 60000);
  const fim = new Date(inicio.getTime() + duracaoMinutos * 60 * 1000);

  const disponiveis = await horariosLivres({
    barbeariaId: agendamento.barbeariaId,
    profissionalId,
    data: inicioDoDiaBrasil(inicio),
    duracaoMinutos,
    ignorarAgendamentoId: agendamento.id,
    ...grade,
  });
  if (!disponiveis.some((h) => h.getTime() === inicio.getTime())) {
    return { ok: false, erro: "Esse horário não está mais disponível. Escolha outro.", status: 409 };
  }

  // Horário novo, lembrete novo. Se o novo horário já está dentro da janela
  // do lembrete, o "seu horário mudou" faz esse papel e o lembrete é dispensado.
  const barbearia = await prisma.barbearia.findUnique({
    where: { id: agendamento.barbeariaId },
    select: { lembreteHorasAntes: true },
  });
  const agora = new Date();
  const lembreteEnviadoEm = dentroDaJanelaDeLembrete(inicio, barbearia?.lembreteHorasAntes ?? null, agora)
    ? agora
    : null;

  try {
    const atualizado = await prisma.$transaction(async (tx) => {
      const conflito = await tx.agendamento.findFirst({
        where: {
          barbeariaId: agendamento.barbeariaId,
          barbeiroId: profissionalId,
          id: { not: agendamento.id },
          status: { not: "CANCELADO" },
          inicio: { lt: fim },
          fim: { gt: inicio },
        },
      });
      if (conflito) throw new HorarioOcupado();

      // Só muda se continua confirmado (o cliente pode ter cancelado pelo
      // link enquanto a equipe mexia, ou o contrário).
      const mudou = await tx.agendamento.updateMany({
        where: { id: agendamento.id, status: "CONFIRMADO" },
        data: { inicio, fim, barbeiroId: profissionalId, lembreteEnviadoEm },
      });
      if (mudou.count === 0) return null;
      return tx.agendamento.findUniqueOrThrow({ where: { id: agendamento.id } });
    });
    if (!atualizado) {
      return { ok: false, erro: "Este agendamento acabou de mudar. Atualize a página.", status: 409 };
    }
    return { ok: true, agendamento: atualizado };
  } catch (erro) {
    if (erro instanceof HorarioOcupado || ehConflitoDeHorario(erro)) {
      return { ok: false, erro: "Esse horário acabou de ser preenchido. Escolha outro.", status: 409 };
    }
    throw erro;
  }
}
