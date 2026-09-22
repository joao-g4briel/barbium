import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { calcularVencimentoInicial, calcularProximoVencimento } from "@/lib/assinatura";

const ativarSchema = z.object({
  tipo: z.enum(["MENSAL", "TRIMESTRAL"]),
  valor: z.coerce.number().min(0),
  // Só usado quando ainda não existe assinatura — numa renovação, a data
  // de início não faz sentido pedir de novo, o cálculo parte do vencimento
  // atual (ou de hoje, se já venceu).
  dataInicio: z.string().optional(),
});

async function carregarCliente(id: string, barbeariaId: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente || cliente.barbeariaId !== barbeariaId) return null;
  return cliente;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode gerenciar assinaturas." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const cliente = await carregarCliente(id, sessao.barbeariaId!);
  if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });

  const corpo = await request.json().catch(() => null);
  const dados = ativarSchema.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const jaTinhaAssinatura = cliente.assinaturaVencimento !== null;

  const vencimento = jaTinhaAssinatura
    ? calcularProximoVencimento(cliente.assinaturaVencimento, dados.data.tipo)
    : calcularVencimentoInicial(
        dados.data.dataInicio ? new Date(dados.data.dataInicio) : new Date(),
        dados.data.tipo,
      );

  const atualizado = await prisma.cliente.update({
    where: { id },
    data: {
      assinaturaTipo: dados.data.tipo,
      assinaturaValor: dados.data.valor,
      assinaturaVencimento: vencimento,
    },
  });

  return NextResponse.json({ cliente: atualizado });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode gerenciar assinaturas." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const cliente = await carregarCliente(id, sessao.barbeariaId!);
  if (!cliente) return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });

  const atualizado = await prisma.cliente.update({
    where: { id },
    data: { assinaturaTipo: null, assinaturaValor: null, assinaturaVencimento: null },
  });

  return NextResponse.json({ cliente: atualizado });
}
