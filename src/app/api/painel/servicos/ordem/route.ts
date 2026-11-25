import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

// Ordem dos serviços no link de agendamento: recebe os ids na ordem nova e
// grava a posição de cada um. Os que não vierem (desativados) vão pro fim.
const corpoSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) });

export async function PUT(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  if (sessao.role !== "DONO") {
    return NextResponse.json({ erro: "Só o dono da barbearia pode mudar a ordem dos serviços." }, { status: 403 });
  }

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  const ids = [...new Set(dados.data.ids)];

  const servicos = await prisma.servico.findMany({
    where: { barbeariaId: sessao.barbeariaId! },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true },
  });
  const daBarbearia = new Set(servicos.map((s) => s.id));
  if (ids.some((id) => !daBarbearia.has(id))) {
    return NextResponse.json({ erro: "Serviço não encontrado." }, { status: 404 });
  }
  const restantes = servicos.map((s) => s.id).filter((id) => !ids.includes(id));

  await prisma.$transaction(
    [...ids, ...restantes].map((id, ordem) => prisma.servico.update({ where: { id }, data: { ordem } })),
  );
  return NextResponse.json({ ok: true });
}
