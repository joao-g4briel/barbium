import type { StatusAgendamento } from "@prisma/client";

export const ROTULO_STATUS: Record<StatusAgendamento, string> = {
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTA: "Falta",
};

export function classeBadgeStatus(status: StatusAgendamento): string {
  return status === "CANCELADO" || status === "FALTA" ? "badge badge-inativo" : "badge badge-ativo";
}
