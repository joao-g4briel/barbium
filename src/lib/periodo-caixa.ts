import { inicioDoDiaBrasil, fimDoDiaBrasil } from "./fuso-brasil";

export type PeriodoCaixa = "hoje" | "semana" | "mes";

export const ROTULO_PERIODO: Record<PeriodoCaixa, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
};

export function intervaloPeriodo(periodo: PeriodoCaixa): { inicio: Date; fim: Date } {
  const agora = new Date();
  const fim = fimDoDiaBrasil(agora);
  const hojeInicio = inicioDoDiaBrasil(agora);

  let inicio: Date;
  if (periodo === "hoje") {
    inicio = hojeInicio;
  } else if (periodo === "semana") {
    inicio = new Date(hojeInicio.getTime() - 6 * 24 * 60 * 60 * 1000);
  } else {
    inicio = new Date(Date.UTC(hojeInicio.getUTCFullYear(), hojeInicio.getUTCMonth(), 1));
  }

  return { inicio, fim };
}

export function periodoValido(valor: string | undefined): PeriodoCaixa {
  return valor === "hoje" || valor === "semana" ? valor : "mes";
}
