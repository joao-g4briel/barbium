import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { horarioBrasil, inicioDoDiaBrasil } from "@/lib/fuso-brasil";

const criarLancamentoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  valor: z.coerce.number().positive(),
  descricao: z.string().min(2, "Informe uma descrição."),
  data: z.string().optional(),
  formaPagamento: z.enum(["PIX", "DINHEIRO", "DEBITO", "CREDITO"]).nullable().optional(),
});

function instanteDoLancamento(dia: string | undefined): Date {
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return new Date();
  const [ano, mes, d] = dia.split("-").map(Number);
  const diaCalendario = new Date(Date.UTC(ano, mes - 1, d));
  const hoje = inicioDoDiaBrasil(new Date());
  return diaCalendario.getTime() === hoje.getTime() ? new Date() : horarioBrasil(diaCalendario, 12 * 60);
}

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

  // A data escolhida é um dia de calendário em Brasília. Hoje: agora mesmo.
  // Outro dia: meio-dia em Brasília (ler "AAAA-MM-DD" como meia-noite UTC
  // jogava o lançamento pro dia anterior, às 21h).
  const criadoEm = instanteDoLancamento(dados.data.data);

  const lancamento = await prisma.caixaLancamento.create({
    data: {
      tipo: dados.data.tipo,
      valor: dados.data.valor,
      descricao: dados.data.descricao,
      barbeariaId: sessao.barbeariaId!,
      origem: "MANUAL",
      formaPagamento: dados.data.formaPagamento ?? null,
      criadoEm,
    },
  });

  return NextResponse.json({ lancamento });
}
