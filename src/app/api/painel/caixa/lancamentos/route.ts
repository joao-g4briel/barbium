import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

const criarLancamentoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  valor: z.coerce.number().positive(),
  descricao: z.string().min(2, "Informe uma descrição."),
  data: z.string().optional(),
});

export async function POST(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode lançar no caixa." },
      { status: 403 },
    );
  }

  const corpo = await request.json().catch(() => null);
  const dados = criarLancamentoSchema.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const criadoEm = dados.data.data ? new Date(dados.data.data) : new Date();

  const lancamento = await prisma.caixaLancamento.create({
    data: {
      tipo: dados.data.tipo,
      valor: dados.data.valor,
      descricao: dados.data.descricao,
      barbeariaId: sessao.barbeariaId!,
      criadoEm,
    },
  });

  return NextResponse.json({ lancamento });
}
