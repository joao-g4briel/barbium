import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Campos de um plano de corte, iguais na criação e na edição.
export const dadosPlanoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do plano.").max(60, "Use um nome mais curto."),
  valor: z.coerce.number().min(1, "Informe o valor do mês.").max(10000, "Valor alto demais."),
  usosPorMes: z.coerce.number().int().min(1, "Use pelo menos 1 atendimento.").max(100).nullable(),
  comissaoValor: z.coerce.number().min(0, "A comissão não pode ser negativa.").max(10000),
  servicoIds: z.array(z.string().min(1)).min(1, "Escolha pelo menos um serviço do plano.").max(100),
});

// Os serviços escolhidos precisam ser desta barbearia.
export async function servicosDaBarbearia(barbeariaId: string, ids: string[]): Promise<string[] | null> {
  const unicos = [...new Set(ids)];
  const encontrados = await prisma.servico.findMany({
    where: { id: { in: unicos }, barbeariaId },
    select: { id: true },
  });
  return encontrados.length === unicos.length ? unicos : null;
}
