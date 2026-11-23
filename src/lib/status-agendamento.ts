import type { StatusAgendamento } from "@prisma/client";

export const ROTULO_STATUS: Record<StatusAgendamento, string> = {
  CONFIRMADO: "Confirmado",
  CHEGOU: "Chegou",
  EM_ATENDIMENTO: "Em atendimento",
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
  CHEGOU: "info",
  EM_ATENDIMENTO: "sucesso",
  CONCLUIDO: "sucesso",
  CANCELADO: "neutro",
  FALTA: "atencao",
  AGUARDANDO_PAGAMENTO: "atencao",
};

// Atendimento que ainda vai acontecer ou está acontecendo: confirmado, o
// cliente chegou, ou já está na cadeira. É o que pode ser concluído, ter o
// serviço trocado e conta como "a receber".
export const STATUS_EM_ABERTO: StatusAgendamento[] = ["CONFIRMADO", "CHEGOU", "EM_ATENDIMENTO"];

export function estaEmAberto(status: StatusAgendamento): boolean {
  return STATUS_EM_ABERTO.includes(status);
}

// Mudanças de status que a equipe pode fazer pelo painel, a partir de cada
// status. (Sair de "aguardando sinal" e concluir têm regras extras na rota.)
export const TRANSICOES: Record<StatusAgendamento, StatusAgendamento[]> = {
  AGUARDANDO_PAGAMENTO: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["CHEGOU", "EM_ATENDIMENTO", "CONCLUIDO", "FALTA", "CANCELADO"],
  // Quem chegou não é falta; volta pra confirmado se marcou por engano.
  CHEGOU: ["EM_ATENDIMENTO", "CONCLUIDO", "CONFIRMADO", "CANCELADO"],
  EM_ATENDIMENTO: ["CONCLUIDO", "CHEGOU", "CANCELADO"],
  // Reabrir.
  CONCLUIDO: ["CONFIRMADO"],
  FALTA: ["CONFIRMADO"],
  CANCELADO: ["CONFIRMADO"],
};

export function transicaoPermitida(de: StatusAgendamento, para: StatusAgendamento): boolean {
  return TRANSICOES[de].includes(para);
}
