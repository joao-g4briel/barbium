import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  const bloqueio = await prisma.bloqueioAgenda.findUnique({ where: { id } });

  if (!bloqueio || bloqueio.usuarioId !== sessao.sub) {
    return NextResponse.json({ erro: "Bloqueio não encontrado." }, { status: 404 });
  }

  await prisma.bloqueioAgenda.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
