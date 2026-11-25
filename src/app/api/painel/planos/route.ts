import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { dadosPlanoSchema, servicosDaBarbearia } from "./dados-plano";

export async function POST(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  if (sessao.role !== "DONO") {
    return NextResponse.json({ erro: "Só o dono da barbearia pode criar planos." }, { status: 403 });
  }

  const dados = dadosPlanoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json({ erro: dados.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const servicoIds = await servicosDaBarbearia(sessao.barbeariaId!, dados.data.servicoIds);
  if (!servicoIds) return NextResponse.json({ erro: "Serviço não encontrado." }, { status: 404 });

  const plano = await prisma.planoCorte.create({
    data: {
      barbeariaId: sessao.barbeariaId!,
      nome: dados.data.nome,
      valor: dados.data.valor,
      usosPorMes: dados.data.usosPorMes,
      comissaoValor: dados.data.comissaoValor,
      servicos: { create: servicoIds.map((servicoId) => ({ servicoId })) },
    },
  });
  return NextResponse.json({ plano: { id: plano.id } });
}
