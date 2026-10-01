import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashSenha } from "@/lib/auth";
import { SENHA_MINIMO } from "@/lib/senha";
import { buscarTokenValido } from "@/lib/recuperacao-senha";

const corpoSchema = z.object({
  token: z.string().min(1),
  novaSenha: z.string().min(SENHA_MINIMO),
});

const LINK_INVALIDO = "Este link é inválido ou já expirou. Peça um novo.";

class LinkJaUsado extends Error {}

export async function POST(request: Request) {
  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json(
      { erro: `A nova senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.` },
      { status: 400 },
    );
  }

  const registro = await buscarTokenValido(dados.data.token);
  if (!registro) return NextResponse.json({ erro: LINK_INVALIDO }, { status: 400 });

  const senhaHash = await hashSenha(dados.data.novaSenha);

  try {
    await prisma.$transaction(async (tx) => {
      // Marca como usado só se ainda não estava: dois envios simultâneos do
      // mesmo link não redefinem a senha duas vezes.
      const marcado = await tx.tokenRedefinicaoSenha.updateMany({
        where: { id: registro.id, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      if (marcado.count !== 1) throw new LinkJaUsado();

      // senhaAlteradaEm derruba as sessões abertas antes da redefinição.
      await tx.usuario.update({
        where: { id: registro.usuarioId },
        data: { senhaHash, senhaAlteradaEm: new Date() },
      });
      // Outros links pedidos antes deixam de valer.
      await tx.tokenRedefinicaoSenha.deleteMany({ where: { usuarioId: registro.usuarioId, id: { not: registro.id } } });
    });
  } catch (erro) {
    if (erro instanceof LinkJaUsado) return NextResponse.json({ erro: LINK_INVALIDO }, { status: 400 });
    throw erro;
  }

  return NextResponse.json({ ok: true });
}
