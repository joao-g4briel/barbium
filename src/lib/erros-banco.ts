import { Prisma } from "@prisma/client";

// Telefone, e-mail ou slug repetido que passou pela conferência prévia da rota
// (dois envios do mesmo formulário ao mesmo tempo): o índice único do banco
// recusa o segundo, e a rota responde com a mesma mensagem da conferência.
export function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}
