// Fusos horários do Brasil. Nenhum tem horário de verão desde 2019, então
// cada um é um deslocamento fixo em relação ao UTC.

export interface Fuso {
  iana: string;
  rotulo: string;
  offsetMinutos: number;
}

export const FUSO_PADRAO = "America/Sao_Paulo";

export const FUSOS: Fuso[] = [
  { iana: "America/Sao_Paulo", rotulo: "Horário de Brasília (UTC−3): a maior parte do país", offsetMinutos: 180 },
  { iana: "America/Manaus", rotulo: "UTC−4: Amazonas, Mato Grosso, Mato Grosso do Sul, Rondônia e Roraima", offsetMinutos: 240 },
  { iana: "America/Rio_Branco", rotulo: "UTC−5: Acre e oeste do Amazonas", offsetMinutos: 300 },
  { iana: "America/Noronha", rotulo: "UTC−2: Fernando de Noronha", offsetMinutos: 120 },
];

export function fusoValido(iana: unknown): iana is string {
  return typeof iana === "string" && FUSOS.some((f) => f.iana === iana);
}

// Minutos a SOMAR à hora local para chegar ao UTC (Brasília = 180).
export function offsetDoFuso(iana: string | null | undefined): number {
  return FUSOS.find((f) => f.iana === iana)?.offsetMinutos ?? 180;
}

export function ianaDoFuso(iana: string | null | undefined): string {
  return fusoValido(iana) ? iana : FUSO_PADRAO;
}
