import type { Plano } from "@prisma/client";

export const ROTULO_PLANO: Record<Plano, string> = {
  SOLO: "Solo",
  BARBEARIA: "Barbearia",
  REDE: "Rede",
};

export const PLANOS: Plano[] = ["SOLO", "BARBEARIA", "REDE"];
