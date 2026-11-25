import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { DESCRICAO_SERVICO_MAXIMO } from "@/lib/pagina-agendamento";

const criarServicoSchema = z.object({
  nome: z.string().min(2, "Informe o nome do serviço."),
  duracaoMinutos: z.coerce.number().int().min(5).max(480),
  preco: z.coerce.number().min(0),
  comissaoPercentual: z.coerce.number().min(0).max(100).optional().nullable(),
  // Texto curto que o cliente vê no link de agendamento. Vazio apaga.
  descricao: z
    .string()
    .trim()
    .max(DESCRICAO_SERVICO_MAXIMO, `Descrição muito longa (até ${DESCRICAO_SERVICO_MAXIMO} caracteres).`)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
});

export async function GET() {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const servicos = await prisma.servico.findMany({
    where: { barbeariaId: sessao.barbeariaId! },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  return NextResponse.json({ servicos });
}

export async function POST(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  // Só o dono mexe em serviço, preço e comissão — o barbeiro só usa a agenda.
  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode cadastrar serviços." },
      { status: 403 },
    );
  }

  const corpo = await request.json().catch(() => null);
  const dados = criarServicoSchema.safeParse(corpo);

  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  // Serviço novo entra no fim da lista que a barbearia já ordenou.
  const ultimo = await prisma.servico.aggregate({
    where: { barbeariaId: sessao.barbeariaId! },
    _max: { ordem: true },
  });
  const servico = await prisma.servico.create({
    data: { ...dados.data, barbeariaId: sessao.barbeariaId!, ordem: (ultimo._max.ordem ?? -1) + 1 },
  });

  return NextResponse.json({ servico });
}
