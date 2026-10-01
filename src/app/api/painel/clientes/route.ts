import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

const criarClienteSchema = z.object({
  nome: z.string().min(2, "Informe o nome do cliente."),
  telefone: z.string().min(8, "Informe um telefone válido."),
});

export async function GET(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  // Com ?q=, busca por nome ou telefone e devolve só os primeiros resultados
  // (usado na escolha de cliente do novo agendamento).
  const termo = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const digitos = termo.replace(/\D/g, "");

  const clientes = await prisma.cliente.findMany({
    where: {
      barbeariaId: sessao.barbeariaId!,
      ...(termo
        ? {
            OR: [
              { nome: { contains: termo, mode: "insensitive" as const } },
              ...(digitos.length >= 3 ? [{ telefone: { contains: digitos } }] : []),
            ],
          }
        : {}),
    },
    orderBy: { nome: "asc" },
    ...(termo ? { take: 8, select: { id: true, nome: true, telefone: true } } : {}),
  });

  return NextResponse.json({ clientes });
}

export async function POST(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode cadastrar clientes." },
      { status: 403 },
    );
  }

  const corpo = await request.json().catch(() => null);
  const dados = criarClienteSchema.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const telefoneNormalizado = dados.data.telefone.replace(/\D/g, "");
  if (telefoneNormalizado.length < 8) {
    return NextResponse.json({ erro: "Informe um telefone válido." }, { status: 400 });
  }

  const existente = await prisma.cliente.findUnique({
    where: {
      barbeariaId_telefone: { barbeariaId: sessao.barbeariaId!, telefone: telefoneNormalizado },
    },
  });
  if (existente) {
    return NextResponse.json(
      { erro: "Já existe um cliente com esse telefone." },
      { status: 409 },
    );
  }

  const cliente = await prisma.cliente.create({
    data: {
      nome: dados.data.nome,
      telefone: telefoneNormalizado,
      barbeariaId: sessao.barbeariaId!,
    },
  });

  return NextResponse.json({ cliente });
}
