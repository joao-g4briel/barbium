import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { dadosPlanoSchema, servicosDaBarbearia } from "../dados-plano";

const edicaoSchema = dadosPlanoSchema.extend({ ativo: z.boolean() });

// Mudar valor, serviços ou comissão vale daqui pra frente: meses já pagos e
// atendimentos já concluídos não mudam.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  if (sessao.role !== "DONO") {
    return NextResponse.json({ erro: "Só o dono da barbearia pode mudar planos." }, { status: 403 });
  }

  const { id } = await params;
  const plano = await prisma.planoCorte.findUnique({ where: { id }, select: { barbeariaId: true } });
  if (!plano || plano.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Plano não encontrado." }, { status: 404 });
  }

  const dados = edicaoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json({ erro: dados.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  const servicoIds = await servicosDaBarbearia(sessao.barbeariaId!, dados.data.servicoIds);
  if (!servicoIds) return NextResponse.json({ erro: "Serviço não encontrado." }, { status: 404 });

  await prisma.$transaction([
    prisma.planoCorteServico.deleteMany({ where: { planoId: id } }),
    prisma.planoCorte.update({
      where: { id },
      data: {
        nome: dados.data.nome,
        valor: dados.data.valor,
        usosPorMes: dados.data.usosPorMes,
        comissaoValor: dados.data.comissaoValor,
        ativo: dados.data.ativo,
        servicos: { create: servicoIds.map((servicoId) => ({ servicoId })) },
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
