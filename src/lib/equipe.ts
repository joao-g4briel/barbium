import "server-only";
import { z } from "zod";
import type { DiaSemana, Prisma } from "@prisma/client";
import { exigirUsuarioDaBarbearia } from "./sessao";
import { prisma } from "./prisma";
import { LIMITE_PROFISSIONAIS, cabeMaisUm } from "./planos";

export const comissaoSchema = z
  .number()
  .min(0, "A comissão vai de 0% a 100%.")
  .max(100, "A comissão vai de 0% a 100%.")
  .nullable();

export const dadosProfissionalSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  comissaoPercentual: comissaoSchema,
});

export async function exigirDono() {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  return sessao && sessao.role === "DONO" ? sessao : null;
}

// Mesmo expediente padrão que o dono recebe ao criar a barbearia: segunda a
// sábado, 09h–19h. Sem isso o profissional não teria horário nenhum.
export async function criarExpedientePadrao(tx: Prisma.TransactionClient, usuarioId: string) {
  const diasUteis: DiaSemana[] = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];
  await tx.expedienteDia.createMany({
    data: [
      { usuarioId, diaSemana: "DOMINGO", atende: false },
      ...diasUteis.map((diaSemana) => ({ usuarioId, diaSemana, atende: true, horaInicio: "09:00", horaFim: "19:00" })),
    ],
  });
}

export async function contarProfissionaisAtivos(
  db: Prisma.TransactionClient | typeof prisma,
  barbeariaId: string,
): Promise<number> {
  return db.usuario.count({ where: { barbeariaId, ativo: true, role: { in: ["DONO", "BARBEIRO"] } } });
}

// Situação da barbearia frente ao limite do plano — usada nas telas e nas rotas.
export async function situacaoDoPlano(barbeariaId: string) {
  const barbearia = await prisma.barbearia.findUnique({ where: { id: barbeariaId }, select: { plano: true } });
  const plano = barbearia?.plano ?? "SOLO";
  const ativos = await contarProfissionaisAtivos(prisma, barbeariaId);
  return { plano, ativos, limite: LIMITE_PROFISSIONAIS[plano], cabeMaisUm: cabeMaisUm(plano, ativos) };
}

// Mensagens de validação escritas aqui; o resto vira genérico.
export function mensagemValidacao(erro: z.ZodError): string {
  return erro.issues.find((i) => /^(Informe|A comissão)/.test(i.message))?.message ?? "Dados inválidos.";
}
