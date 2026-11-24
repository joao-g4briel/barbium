import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/equipe";
import { corValida } from "@/lib/cor-marca";

// Página de agendamento: endereço e cor da marca (o logo tem rota própria).
const corpoSchema = z.object({
  endereco: z.string().trim().max(200, "Endereço muito longo (até 200 caracteres).").nullable(),
  corMarca: z
    .string()
    .trim()
    .refine((c) => corValida(c), "Cor inválida.")
    .nullable(),
});

export async function PATCH(request: Request) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode editar a página de agendamento." }, { status: 403 });

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: dados.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });

  await prisma.barbearia.update({
    where: { id: sessao.barbeariaId! },
    data: {
      endereco: dados.data.endereco || null,
      corMarca: dados.data.corMarca ? dados.data.corMarca.toLowerCase() : null,
    },
  });
  return NextResponse.json({ ok: true });
}
