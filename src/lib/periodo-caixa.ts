export type PeriodoCaixa = "hoje" | "semana" | "mes";

export const ROTULO_PERIODO: Record<PeriodoCaixa, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
};

export function intervaloPeriodo(periodo: PeriodoCaixa): { inicio: Date; fim: Date } {
  const fim = new Date();
  fim.setHours(23, 59, 59, 999);

  const inicio = new Date();
  if (periodo === "hoje") {
    inicio.setHours(0, 0, 0, 0);
  } else if (periodo === "semana") {
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
  } else {
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
  }

  return { inicio, fim };
}

export function periodoValido(valor: string | undefined): PeriodoCaixa {
  return valor === "hoje" || valor === "semana" ? valor : "mes";
}
