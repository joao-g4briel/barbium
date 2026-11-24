"use client";

import { createContext, useContext, type ReactNode } from "react";
import { FUSO_PADRAO } from "@/lib/fusos";

// Fuso horário da barbearia para os componentes do navegador. O layout do
// painel e as páginas públicas informam o fuso; sem provedor, vale Brasília.
const ContextoFuso = createContext<string>(FUSO_PADRAO);

export function ProvedorFuso({ fuso, children }: { fuso: string; children: ReactNode }) {
  return <ContextoFuso.Provider value={fuso}>{children}</ContextoFuso.Provider>;
}

export function useFuso(): string {
  return useContext(ContextoFuso);
}
