import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { acessoVencido } from "@/lib/acesso";
import { apenasDigitos } from "@/lib/formatar";
import { situacaoPorTelefone } from "@/lib/planos-corte";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao } from "@/lib/limite-tentativas";

// "Sou assinante": diz se o WhatsApp informado tem plano nesta barbearia, e
// qual. Devolve só o plano e a validade, nunca nome ou dados do cliente.
const corpoSchema = z.object({ telefone: z.string() });

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  const telefone = dados.success ? apenasDigitos(dados.data.telefone) : "";
  if (telefone.length < 10) {
    return NextResponse.json({ erro: "Informe o WhatsApp com DDD." }, { status: 400 });
  }

  const barbearia = await prisma.barbearia.findUnique({ where: { slug } });
  if (!barbearia || !barbearia.ativo || acessoVencido(barbearia)) {
    return NextResponse.json({ erro: "Barbearia não encontrada." }, { status: 404 });
  }

  // Freia quem tentar descobrir, número por número, quem assina.
  const permitido = await dentroDosLimites([
    { chave: `assinante:ip:${ipDaRequisicao(request)}`, maximo: 20, janelaSegundos: 60 * 60 },
  ]);
  if (!permitido) return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });

  return NextResponse.json(await situacaoPorTelefone(barbearia.id, telefone));
}
