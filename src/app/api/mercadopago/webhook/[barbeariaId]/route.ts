import { NextResponse } from "next/server";
import { buscarPagamento, ErroMercadoPago } from "@/lib/mercadopago";
import { aplicarPagamento, obterTokenMercadoPago } from "@/lib/sinal";

// Notificação do Mercado Pago sobre um pagamento. O corpo só diz QUAL
// pagamento mudou; o estado de verdade é lido da API com o token da própria
// barbearia, então uma notificação forjada não confirma nada.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ barbeariaId: string }> },
) {
  const { barbeariaId } = await params;
  const url = new URL(request.url);
  const corpo = await request.json().catch(() => null);

  const tipo = corpo?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const pagamentoId = corpo?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (tipo !== "payment" || !pagamentoId) return NextResponse.json({ ok: true });

  const token = await obterTokenMercadoPago(barbeariaId).catch(() => null);
  if (!token) return NextResponse.json({ ok: true });

  try {
    const pagamento = await buscarPagamento(token, String(pagamentoId));
    const resultado = await aplicarPagamento(barbeariaId, pagamento);
    return NextResponse.json({ ok: true, resultado });
  } catch (erro) {
    // Pagamento que não é desta conta: nada a fazer. Outras falhas devolvem
    // 500 pra o Mercado Pago tentar de novo mais tarde.
    if (erro instanceof ErroMercadoPago && erro.status === 404) return NextResponse.json({ ok: true });
    console.error("Webhook Mercado Pago:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
