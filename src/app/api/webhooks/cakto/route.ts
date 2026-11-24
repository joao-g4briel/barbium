import { NextResponse } from "next/server";
import { webhookAutentico, type EventoCakto } from "@/lib/cakto-regras";
import { processarEventoCakto } from "@/lib/cakto";

// Webhook da Cakto (Integrações > Webhooks no painel da Cakto), com os eventos
// de compra aprovada, renovação, reembolso, chargeback e cancelamento.
// CAKTO_WEBHOOK_SECRET é o "secret" que a Cakto gera ao criar o webhook.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const segredo = process.env.CAKTO_WEBHOOK_SECRET;
  if (!segredo) return NextResponse.json({ erro: "Webhook da Cakto não configurado." }, { status: 503 });

  const corpo = await request.text();
  const autentico = webhookAutentico(
    corpo,
    { assinatura: request.headers.get("x-cakto-signature"), timestamp: request.headers.get("x-cakto-timestamp") },
    segredo,
  );
  if (!autentico) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });

  let evento: EventoCakto;
  try {
    evento = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  try {
    const resultados = await processarEventoCakto(evento);
    return NextResponse.json({ ok: true, resultados });
  } catch (erro) {
    // Erro do nosso lado: responde 500 pra aparecer como falha no histórico
    // da Cakto (dá pra reenviar o evento de lá).
    console.error("Webhook Cakto:", erro);
    return NextResponse.json({ erro: "Falha ao processar." }, { status: 500 });
  }
}
