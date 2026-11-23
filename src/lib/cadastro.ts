import "server-only";
import { z } from "zod";
import type { Plano, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { numeroWhatsApp } from "./formatar";
import { SENHA_MINIMO } from "./senha";
import { DIAS_TESTE } from "./precos";

// Cadastro de barbearia pelo próprio site: cria a barbearia (em teste grátis)
// e o dono, que já entra logado.

export const cadastroSchema = z.object({
  nomeBarbearia: z.string().trim().min(2, "Informe o nome da barbearia.").max(80, "Nome muito longo."),
  nome: z.string().trim().min(2, "Informe o seu nome.").max(80, "Nome muito longo."),
  email: z.string().trim().email("Informe um e-mail válido.").max(120),
  whatsapp: z.string().trim().refine((v) => numeroWhatsApp(v) !== null, "Informe o WhatsApp com DDD."),
  senha: z.string().min(SENHA_MINIMO, `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`).max(200),
  plano: z.enum(["SOLO", "BARBEARIA", "REDE"]),
  // Campo escondido: gente não preenche, robô costuma preencher.
  site: z.string().max(0).optional(),
});

export type DadosCadastro = z.infer<typeof cadastroSchema>;

// "Barbearia do Zé & Filhos" → "barbearia-do-ze-filhos"
export function slugDoNome(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base.length >= 2 ? base : "barbearia";
}

// Primeiro link livre: o próprio slug, depois slug-2, slug-3...
export async function slugDisponivel(db: Prisma.TransactionClient | typeof prisma, nome: string): Promise<string> {
  const base = slugDoNome(nome);
  const usados = new Set(
    (await db.barbearia.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((b) => b.slug),
  );
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidato = `${base}-${n}`;
    if (!usados.has(candidato)) return candidato;
  }
}

export function fimDoTeste(agora = new Date()): Date {
  return new Date(agora.getTime() + DIAS_TESTE * 24 * 60 * 60 * 1000);
}

export const ROTULO_PLANO_CADASTRO: Record<Plano, string> = {
  SOLO: "Solo",
  BARBEARIA: "Barbearia",
  REDE: "Rede",
};
