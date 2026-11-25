import { NextResponse } from "next/server";
import { buscarCobrancaCartao, buscarPagamento, ErroMercadoPago } from "@/lib/mercadopago";
import { aplicarPagamento, obterTokenMercadoPago } from "@/lib/sinal";
import { prisma } from "@/lib/prisma";
import {
  PREFIXO_REFERENCIA_ASSINATURA,
  PREFIXO_REFERENCIA_CARTAO,
  aplicarPagamentoAssinatura,
  sincronizarCartao,
} from "@/lib/planos-corte";

// Notificação do Mercado Pago. O corpo só diz QUAL coisa mudou; o estado de
// verdade é lido da API com o token da própria barbearia, então uma
// notificação forjada não confirma nada.
//
// - payment: sinal de agendamento, mês de plano no Pix, ou cobrança de uma
//   assinatura no cartão (essa vira uma sincronização da assinatura).
// - subscription_preapproval / subscription_authorized_payment: só chegam se
//   a barbearia ligou os avisos de assinatura no painel do Mercado Pago. Sem
//   eles, as cobranças do cartão são lidas pela rota dos lembretes.

async function sincronizarDaBarbearia(barbeariaId: string, filtro: { id?: string; mpPreapprovalId?: string }) {
  const assinatura = await prisma.assinaturaPlano.findFirst({
    where: { barbeariaId, ...filtro },
    select: { id: true },
  });
  if (!assinatura) return "ignorado";
  await sincronizarCartao(assinatura.id);
  return "sincronizado";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ barbeariaId: string }> },
) {
  const { barbeariaId } = await params;
  const url = new URL(request.url);
  const corpo = await request.json().catch(() => null);

  const tipo = corpo?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const id = corpo?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const conhecidos = ["payment", "subscription_preapproval", "subscription_authorized_payment"];
  if (!conhecidos.includes(tipo) || !id) return NextResponse.json({ ok: true });

  const token = await obterTokenMercadoPago(barbeariaId).catch(() => null);
  if (!token) return NextResponse.json({ ok: true });

  try {
    if (tipo === "subscription_preapproval") {
      const resultado = await sincronizarDaBarbearia(barbeariaId, { mpPreapprovalId: String(id) });
      return NextResponse.json({ ok: true, resultado });
    }
    if (tipo === "subscription_authorized_payment") {
      const cobranca = await buscarCobrancaCartao(token, String(id));
      const resultado = await sincronizarDaBarbearia(barbeariaId, { mpPreapprovalId: cobranca.preapproval_id });
      return NextResponse.json({ ok: true, resultado });
    }

    const pagamento = await buscarPagamento(token, String(id));
    const referencia = pagamento.external_reference ?? "";
    let resultado: string;
    if (referencia.startsWith(PREFIXO_REFERENCIA_CARTAO)) {
      resultado = await sincronizarDaBarbearia(barbeariaId, { id: referencia.slice(PREFIXO_REFERENCIA_CARTAO.length) });
    } else if (referencia.startsWith(PREFIXO_REFERENCIA_ASSINATURA)) {
      resultado = await aplicarPagamentoAssinatura(barbeariaId, pagamento);
    } else {
      resultado = await aplicarPagamento(barbeariaId, pagamento);
    }
    return NextResponse.json({ ok: true, resultado });
  } catch (erro) {
    // Coisa que não é desta conta: nada a fazer. Outras falhas devolvem 500
    // pra o Mercado Pago tentar de novo mais tarde.
    if (erro instanceof ErroMercadoPago && erro.status === 404) return NextResponse.json({ ok: true });
    console.error("Webhook Mercado Pago:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
