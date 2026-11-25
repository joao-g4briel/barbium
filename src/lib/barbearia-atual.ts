import "server-only";
import { cache } from "react";
import { prisma } from "./prisma";

// O layout do painel e as páginas precisam dos mesmos dados da barbearia
// (nome, link público); cache() evita buscar duas vezes na mesma requisição.
export const obterBarbearia = cache(async (barbeariaId: string) => {
  return prisma.barbearia.findUnique({
    where: { id: barbeariaId },
    select: {
      id: true,
      nome: true,
      slug: true,
      telefone: true,
      telefoneAvisos: true,
      lembreteHorasAntes: true,
      fuso: true,
      acessoAte: true,
      emTeste: true,
      whatsappAtivo: true,
      criadoEm: true,
      endereco: true,
      corMarca: true,
      logoAtualizadoEm: true,
      mensagemAgendamento: true,
      mostrarPrecos: true,
      antecedenciaMinimaMin: true,
      diasAFrente: true,
      plano: true,
      ativo: true,
    },
  });
});
