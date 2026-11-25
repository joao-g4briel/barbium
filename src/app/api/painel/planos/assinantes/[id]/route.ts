import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { cancelarPagamento } from "@/lib/mercadopago";
import { obterTokenMercadoPago } from "@/lib/sinal";
import { cancelarRenovacaoCartao, registrarPagamentoNoBalcao } from "@/lib/planos-corte";

// Numa assinatura: registrar mais um mês pago no balcão, ou encerrar.
const corpoSchema = z.union([
  z.object({ acao: z.literal("pagamento"), formaPagamento: z.enum(["PIX", "DINHEIRO", "DEBITO", "CREDITO"]) }),
  z.object({ acao: z.literal("encerrar") }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  if (sessao.role !== "DONO") {
    return NextResponse.json({ erro: "Só o dono da barbearia pode gerenciar assinantes." }, { status: 403 });
  }

  const { id } = await params;
  const assinatura = await prisma.assinaturaPlano.findUnique({
    where: { id },
    include: { plano: { select: { valor: true } } },
  });
  if (!assinatura || assinatura.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Assinatura não encontrada." }, { status: 404 });
  }

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });

  if (assinatura.canceladaEm) {
    return NextResponse.json({ erro: "Essa assinatura já foi encerrada." }, { status: 409 });
  }

  if (dados.data.acao === "pagamento") {
    const { formaPagamento } = dados.data;
    const validaAte = await prisma.$transaction((tx) =>
      registrarPagamentoNoBalcao(tx, {
        barbeariaId: assinatura.barbeariaId,
        assinaturaId: assinatura.id,
        valor: Number(assinatura.plano.valor),
        formaPagamento,
      }),
    );
    return NextResponse.json({ validaAte });
  }

  // Encerrar vale na hora: deixa de valer no agendamento. Horários já
  // marcados pelo plano continuam na agenda, e a barbearia decide sobre eles.
  const pendentes = await prisma.pagamentoAssinatura.findMany({
    where: { assinaturaId: assinatura.id, status: "PENDENTE" },
    select: { id: true, mpPagamentoId: true },
  });
  await prisma.$transaction([
    prisma.assinaturaPlano.update({ where: { id: assinatura.id }, data: { canceladaEm: new Date() } }),
    prisma.pagamentoAssinatura.updateMany({
      where: { assinaturaId: assinatura.id, status: "PENDENTE" },
      data: { status: "EXPIRADO" },
    }),
  ]);
  // Cartão: para a cobrança mensal no Mercado Pago. Se falhar, a assinatura
  // já está encerrada aqui e a falha é registrada para conferir.
  if (assinatura.mpPreapprovalId && assinatura.cartaoStatus !== "cancelled") {
    await cancelarRenovacaoCartao(assinatura.id).catch((erro) => {
      console.error("Encerrar assinatura (cartão):", erro instanceof Error ? erro.message : erro);
    });
  }
  // Pix ainda aberto deixa de valer. Se for pago mesmo assim, o webhook
  // registra o mês e a assinatura volta (lib/planos-corte).
  const token = pendentes.some((p) => p.mpPagamentoId) ? await obterTokenMercadoPago(assinatura.barbeariaId).catch(() => null) : null;
  if (token) {
    for (const p of pendentes) {
      if (p.mpPagamentoId) await cancelarPagamento(token, p.mpPagamentoId).catch(() => {});
    }
  }
  return NextResponse.json({ ok: true });
}
