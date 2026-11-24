import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plano } from "@prisma/client";
import { CHECKOUT_CAKTO, MESES_DO_PERIODO, PERIODOS, type Periodo } from "./precos";

// Partes do webhook da Cakto que não tocam no banco (assinatura, qual oferta
// foi paga, de qual pedido). Docs: https://docs.cakto.com.br/conceitos/webhooks

export interface PedidoCakto {
  id?: string;
  status?: string;
  offer_type?: string;
  checkoutUrl?: string;
  amount?: number;
  sck?: string | null;
  customer?: { email?: string | null; name?: string | null; phone?: string | null } | null;
  offer?: { id?: string | null; name?: string | null } | null;
  product?: { name?: string | null } | null;
}

export interface EventoCakto {
  secret?: string;
  event?: string;
  data?: PedidoCakto | PedidoCakto[];
}

const TOLERANCIA_S = 300;

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Assinatura no cabeçalho (X-Cakto-Signature: v1=<hmac>, sobre "timestamp.corpo")
// ou, se ela não vier, o "secret" do corpo.
export function webhookAutentico(
  corpoBruto: string,
  cabecalhos: { assinatura: string | null; timestamp: string | null },
  segredo: string,
  agoraS = Math.floor(Date.now() / 1000),
): boolean {
  if (cabecalhos.assinatura && cabecalhos.timestamp) {
    const ts = Number(cabecalhos.timestamp);
    if (!Number.isFinite(ts) || Math.abs(agoraS - ts) > TOLERANCIA_S) return false;
    const esperado = createHmac("sha256", segredo).update(`${cabecalhos.timestamp}.${corpoBruto}`).digest("hex");
    const recebido = cabecalhos.assinatura.replace(/^v1=/, "");
    return iguais(recebido, esperado);
  }
  try {
    const corpo = JSON.parse(corpoBruto) as EventoCakto;
    return typeof corpo.secret === "string" && iguais(corpo.secret, segredo);
  } catch {
    return false;
  }
}

// Código da oferta no link do checkout: pay.cakto.com.br/<codigo>[_versão]
function codigosDoLink(url: string): string[] {
  try {
    const trecho = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
    return [trecho, trecho.split("_")[0]].filter(Boolean);
  } catch {
    return [];
  }
}

// Qual plano e período um pedido pagou, comparando a oferta com os links de
// CHECKOUT_CAKTO. null quando não é uma das assinaturas (ex.: order bump).
export function ofertaDoPedido(pedido: PedidoCakto): { plano: Plano; periodo: Periodo; meses: number } | null {
  const codigos = new Set<string>([
    ...(pedido.offer?.id ? [pedido.offer.id, pedido.offer.id.split("_")[0]] : []),
    ...(pedido.checkoutUrl ? codigosDoLink(pedido.checkoutUrl) : []),
  ]);
  for (const plano of Object.keys(CHECKOUT_CAKTO) as Plano[]) {
    for (const periodo of PERIODOS) {
      const link = CHECKOUT_CAKTO[plano][periodo];
      if (link && codigosDoLink(link).some((c) => codigos.has(c))) {
        return { plano, periodo, meses: MESES_DO_PERIODO[periodo] };
      }
    }
  }
  return null;
}

export function pedidosDoEvento(evento: EventoCakto): PedidoCakto[] {
  if (!evento.data) return [];
  return Array.isArray(evento.data) ? evento.data : [evento.data];
}

// Eventos que liberam acesso (pagamento confirmado) e os que só avisam a
// plataforma para decidir à mão.
export const EVENTOS_PAGOS = new Set(["purchase_approved", "subscription_renewed"]);
export const EVENTOS_ALERTA = new Set(["refund", "chargeback", "subscription_canceled", "subscription_renewal_refused", "subscription_late"]);
