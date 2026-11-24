import "server-only";
import type { AcaoHistorico, Prisma, StatusAgendamento } from "@prisma/client";
import { prisma } from "./prisma";
import { capitalizar, formatarDataInstante, formatarHora } from "./formatar";
import { FUSO_PADRAO } from "./fusos";

// Histórico do agendamento: quem criou, mudou o status, o horário ou o
// serviço, e quando. Gravado junto com a mudança (mesma transação, quando há
// uma), pra nunca ficar uma mudança sem registro.

export interface Autor {
  usuarioId: string | null;
  nome: string;
}

export const AUTOR_CLIENTE_LINK: Autor = { usuarioId: null, nome: "Cliente, pelo link" };
export const AUTOR_CLIENTE_AGENDAMENTO: Autor = { usuarioId: null, nome: "Cliente, pelo link de agendamento" };
export const AUTOR_SISTEMA_PIX_PAGO: Autor = { usuarioId: null, nome: "Sistema (Pix do sinal pago)" };
export const AUTOR_SISTEMA_PIX_EXPIRADO: Autor = { usuarioId: null, nome: "Sistema (Pix não pago no prazo)" };

export function autorDaSessao(sessao: { sub: string; nome: string }): Autor {
  return { usuarioId: sessao.sub, nome: sessao.nome };
}

type Cliente = Prisma.TransactionClient | typeof prisma;

export async function registrarHistorico(
  db: Cliente,
  agendamentoId: string,
  autor: Autor,
  entrada: {
    acao: AcaoHistorico;
    statusDe?: StatusAgendamento | null;
    statusPara?: StatusAgendamento | null;
    detalhe?: string | null;
  },
): Promise<void> {
  await db.agendamentoHistorico.create({
    data: {
      agendamentoId,
      acao: entrada.acao,
      statusDe: entrada.statusDe ?? null,
      statusPara: entrada.statusPara ?? null,
      detalhe: entrada.detalhe ?? null,
      usuarioId: autor.usuarioId,
      autor: autor.nome,
    },
  });
}

// "Qui 26/11 09:00"
export function horarioCurto(instante: Date, fuso: string = FUSO_PADRAO): string {
  const dia = formatarDataInstante(instante, { weekday: "short", day: "2-digit", month: "2-digit" }, fuso).replace(".", "").replace(",", "");
  return `${capitalizar(dia)} ${formatarHora(instante, fuso)}`;
}
