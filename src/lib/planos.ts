import type { Plano } from "@prisma/client";

export const ROTULO_PLANO: Record<Plano, string> = {
  SOLO: "Solo",
  BARBEARIA: "Barbearia",
  REDE: "Rede",
};

export const PLANOS: Plano[] = ["SOLO", "BARBEARIA", "REDE"];

// Profissionais ATIVOS (dono incluído) que cada plano comporta. null = sem limite.
export const LIMITE_PROFISSIONAIS: Record<Plano, number | null> = {
  SOLO: 1,
  BARBEARIA: 5,
  REDE: null,
};

export function descreverLimite(plano: Plano): string {
  const limite = LIMITE_PROFISSIONAIS[plano];
  if (limite === null) return "profissionais ilimitados";
  return limite === 1 ? "1 profissional" : `até ${limite} profissionais`;
}

export function cabeMaisUm(plano: Plano, ativos: number): boolean {
  const limite = LIMITE_PROFISSIONAIS[plano];
  return limite === null || ativos < limite;
}

export function mensagemLimite(plano: Plano): string {
  return `O plano ${ROTULO_PLANO[plano]} comporta ${descreverLimite(plano)} ativos. Para cadastrar mais, é preciso mudar de plano.`;
}
