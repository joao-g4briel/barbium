import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

const corpoSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
});

// Cada pessoa edita o próprio nome e e-mail de acesso.
export async function PATCH(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    const nossa = dados.error.issues.find((i) => i.message.startsWith("Informe"))?.message;
    return NextResponse.json({ erro: nossa ?? "Dados inválidos." }, { status: 400 });
  }

  const outro = await prisma.usuario.findUnique({ where: { email: dados.data.email }, select: { id: true } });
  if (outro && outro.id !== sessao.sub) {
    return NextResponse.json({ erro: "Já existe um usuário com esse e-mail." }, { status: 409 });
  }

  await prisma.usuario.update({ where: { id: sessao.sub }, data: dados.data });
  return NextResponse.json({ ok: true });
}
