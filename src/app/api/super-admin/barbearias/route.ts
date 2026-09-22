import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirSuperAdmin } from "@/lib/sessao";
import { hashSenha, gerarSenhaTemporaria } from "@/lib/auth";

const criarBarbeariaSchema = z.object({
  nomeBarbearia: z.string().min(2, "Informe o nome da barbearia."),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen."),
  telefone: z.string().optional(),
  plano: z.enum(["SOLO", "BARBEARIA", "REDE"]),
  nomeDono: z.string().min(2, "Informe o nome do dono."),
  emailDono: z.string().email("E-mail do dono inválido."),
});

export async function GET() {
  try {
    await exigirSuperAdmin();
  } catch {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }

  const barbearias = await prisma.barbearia.findMany({
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json({ barbearias });
}

export async function POST(request: Request) {
  try {
    await exigirSuperAdmin();
  } catch {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }

  const corpo = await request.json().catch(() => null);
  const dados = criarBarbeariaSchema.safeParse(corpo);

  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const { nomeBarbearia, slug, telefone, plano, nomeDono, emailDono } = dados.data;

  const slugEmUso = await prisma.barbearia.findUnique({ where: { slug } });
  if (slugEmUso) {
    return NextResponse.json(
      { erro: "Já existe uma barbearia com esse link (slug)." },
      { status: 409 },
    );
  }

  const emailEmUso = await prisma.usuario.findUnique({ where: { email: emailDono } });
  if (emailEmUso) {
    return NextResponse.json(
      { erro: "Já existe um usuário com esse e-mail." },
      { status: 409 },
    );
  }

  const senhaTemporaria = gerarSenhaTemporaria();
  const senhaHash = await hashSenha(senhaTemporaria);

  const resultado = await prisma.$transaction(async (tx) => {
    const barbearia = await tx.barbearia.create({
      data: { nome: nomeBarbearia, slug, telefone, plano },
    });

    const dono = await tx.usuario.create({
      data: {
        nome: nomeDono,
        email: emailDono,
        senhaHash,
        role: "DONO",
        barbeariaId: barbearia.id,
      },
    });

    return { barbearia, dono };
  });

  return NextResponse.json({
    barbearia: resultado.barbearia,
    dono: { nome: resultado.dono.nome, email: resultado.dono.email },
    senhaTemporaria,
  });
}
