import type { StatusAgendamento } from "@prisma/client";

export const ROTULO_STATUS: Record<StatusAgendamento, string> = {
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTA: "Falta",
  AGUARDANDO_PAGAMENTO: "Aguardando sinal",
};

export type TomBadge = "neutro" | "sucesso" | "info" | "atencao" | "perigo";

// Cancelado não é erro — fica neutro. Vermelho é reservado para erros e
// ações destrutivas; falta pede atenção.
export const TOM_STATUS: Record<StatusAgendamento, TomBadge> = {
  CONFIRMADO: "info",
  CONCLUIDO: "sucesso",
  CANCELADO: "neutro",
  FALTA: "atencao",
  AGUARDANDO_PAGAMENTO: "atencao",
};
