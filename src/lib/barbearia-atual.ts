import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";

// O layout do painel e as páginas precisam dos mesmos dados da barbearia
// (nome, link público); cache() evita buscar duas vezes na mesma requisição.
export const obterBarbearia = cache(async (barbeariaId: string) => {
  return prisma.barbearia.findUnique({
    where: { id: barbeariaId },
    select: { id: true, nome: true, slug: true, telefone: true, plano: true, ativo: true },
  });
});
