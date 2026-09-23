import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

const criarBloqueioSchema = z.object({
  inicio: z.string().datetime(),
  // Ausente/null = bloqueio indefinido (trava de emergência).
  fim: z.string().datetime().nullable().optional(),
  motivo: z.string().max(200).optional(),
});

export async function GET() {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const bloqueios = await prisma.bloqueioAgenda.findMany({
    where: { usuarioId: sessao.sub },
    orderBy: { inicio: "desc" },
  });

  return NextResponse.json({ bloqueios });
}

export async function POST(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const corpo = await request.json().catch(() => null);
  const dados = criarBloqueioSchema.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const inicio = new Date(dados.data.inicio);
  const fim = dados.data.fim ? new Date(dados.data.fim) : null;

  if (fim && fim <= inicio) {
    return NextResponse.json({ erro: "O fim precisa ser depois do início." }, { status: 400 });
  }

  const bloqueio = await prisma.bloqueioAgenda.create({
    data: {
      usuarioId: sessao.sub,
      inicio,
      fim,
      motivo: dados.data.motivo || null,
    },
  });

  return NextResponse.json({ bloqueio });
}
