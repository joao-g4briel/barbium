import { inicioDoDiaBrasil, horarioBrasil } from "./fuso-brasil";
import { FUSO_PADRAO } from "./fusos";

export type PeriodoCaixa = "hoje" | "semana" | "mes" | "mes-passado";

export const PERIODOS_CAIXA: PeriodoCaixa[] = ["hoje", "semana", "mes", "mes-passado"];

export const ROTULO_PERIODO: Record<PeriodoCaixa, string> = {
  hoje: "Hoje",
  semana: "Últimos 7 dias",
  mes: "Este mês",
  "mes-passado": "Mês passado",
};

// Instantes reais em Brasília: da 00:00 do primeiro dia até 23:59:59.999
// do último. inicioDoDiaBrasil devolve o DIA de calendário (meia-noite UTC);
// usar esse valor direto como instante deslocava o período em 3 horas.
export function intervaloPeriodo(periodo: PeriodoCaixa, fuso: string = FUSO_PADRAO): { inicio: Date; fim: Date } {
  const hoje = inicioDoDiaBrasil(new Date(), fuso);

  let primeiroDia: Date;
  let ultimoDia = hoje;
  if (periodo === "hoje") {
    primeiroDia = hoje;
  } else if (periodo === "semana") {
    primeiroDia = new Date(hoje.getTime() - 6 * 24 * 60 * 60 * 1000);
  } else if (periodo === "mes-passado") {
    primeiroDia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
    ultimoDia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 0));
  } else {
    // O mês inteiro, do dia 1 ao último (30, 31, ou 28/29 em fevereiro).
    primeiroDia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
    ultimoDia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0));
  }

  return {
    inicio: horarioBrasil(primeiroDia, 0, fuso),
    fim: new Date(horarioBrasil(ultimoDia, 24 * 60, fuso).getTime() - 1),
  };
}

export function periodoValido(valor: string | undefined): PeriodoCaixa {
  return valor === "hoje" || valor === "semana" || valor === "mes-passado" ? valor : "mes";
}
