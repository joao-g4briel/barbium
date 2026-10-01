import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarSenhaTemporaria, hashSenha } from "@/lib/auth";
import { exigirDono } from "@/lib/equipe";

// O barbeiro esqueceu a senha: o dono gera uma temporária nova e repassa.
// A senha antiga deixa de funcionar na hora e as sessões abertas caem.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode gerar senha para a equipe." }, { status: 403 });
  const { id } = await params;

  const profissional = await prisma.usuario.findUnique({ where: { id } });
  if (!profissional || profissional.barbeariaId !== sessao.barbeariaId || profissional.role !== "BARBEIRO") {
    return NextResponse.json({ erro: "Profissional não encontrado." }, { status: 404 });
  }

  const senhaTemporaria = gerarSenhaTemporaria();
  await prisma.usuario.update({
    where: { id },
    data: { senhaHash: await hashSenha(senhaTemporaria), senhaAlteradaEm: new Date() },
  });

  return NextResponse.json({ senhaTemporaria });
}
