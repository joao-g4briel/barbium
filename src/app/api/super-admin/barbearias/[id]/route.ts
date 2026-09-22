import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirSuperAdmin } from "@/lib/sessao";

const atualizarSchema = z.object({
  plano: z.enum(["SOLO", "BARBEARIA", "REDE"]).optional(),
  ativo: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigirSuperAdmin();
  } catch {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const corpo = await request.json().catch(() => null);
  const dados = atualizarSchema.safeParse(corpo);

  if (!dados.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const barbearia = await prisma.barbearia.update({
    where: { id },
    data: dados.data,
  });

  return NextResponse.json({ barbearia });
}
