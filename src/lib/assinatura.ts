import type { PeriodicidadeAssinatura } from "@prisma/client";

export const DIAS_POR_PERIODO: Record<PeriodicidadeAssinatura, number> = {
  MENSAL: 30,
  TRIMESTRAL: 90,
};

export const ROTULO_PERIODICIDADE: Record<PeriodicidadeAssinatura, string> = {
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
};

export function somarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

// Ativar: vencimento = data de início + período.
export function calcularVencimentoInicial(
  dataInicio: Date,
  tipo: PeriodicidadeAssinatura,
): Date {
  return somarDias(dataInicio, DIAS_POR_PERIODO[tipo]);
}

// Renovar: se ainda está em dia, soma a partir do vencimento atual (não
// perde o tempo que já pagou); se já venceu, conta a partir de hoje.
export function calcularProximoVencimento(
  vencimentoAtual: Date | null,
  tipo: PeriodicidadeAssinatura,
): Date {
  const agora = new Date();
  const base = vencimentoAtual && vencimentoAtual > agora ? vencimentoAtual : agora;
  return somarDias(base, DIAS_POR_PERIODO[tipo]);
}

export type StatusAssinatura = "SEM_ASSINATURA" | "ATIVA" | "VENCIDA";

export function statusAssinatura(vencimento: Date | null): StatusAssinatura {
  if (!vencimento) return "SEM_ASSINATURA";
  return vencimento >= new Date() ? "ATIVA" : "VENCIDA";
}

export const ROTULO_STATUS_ASSINATURA: Record<StatusAssinatura, string> = {
  SEM_ASSINATURA: "Sem assinatura",
  ATIVA: "Assinante em dia",
  VENCIDA: "Assinatura vencida",
};
