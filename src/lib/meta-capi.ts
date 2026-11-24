import "server-only";
import { createHash } from "node:crypto";

// API de Conversões da Meta: manda do servidor os eventos que importam pros
// anúncios (início do teste grátis e pagamento). Funciona mesmo com bloqueador
// de anúncio e no iOS, e o pagamento acontece na Cakto, fora do nosso site.
// Precisa de META_PIXEL_ID (ou NEXT_PUBLIC_META_PIXEL_ID) e META_CAPI_TOKEN;
// sem eles, não faz nada. META_TEST_EVENT_CODE (opcional) manda os eventos
// pra aba "Testar eventos" do Gerenciador de Eventos.

const VERSAO_API = "v21.0";

export interface EventoMeta {
  nome: "StartTrial" | "Purchase" | "Subscribe" | "Lead" | "CompleteRegistration";
  eventId: string;
  url?: string;
  email?: string | null;
  telefone?: string | null; // só dígitos, com DDD (o 55 é adicionado)
  nome_pessoa?: string | null;
  idExterno?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  valor?: number;
  moeda?: string;
  origem?: "website" | "system_generated";
}

const sha256 = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

function telefoneE164(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

export function metaConfigurada(): boolean {
  return Boolean((process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID) && process.env.META_CAPI_TOKEN);
}

// Lê _fbp e _fbc dos cookies da requisição (criados pelo pixel no navegador).
export function cookiesMeta(request: Request): { fbp: string | null; fbc: string | null } {
  const cookies = request.headers.get("cookie") ?? "";
  const ler = (nome: string) => cookies.match(new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`))?.[1] ?? null;
  return { fbp: ler("_fbp"), fbc: ler("_fbc") };
}

export async function enviarEventoMeta(evento: EventoMeta): Promise<void> {
  if (!metaConfigurada()) return;
  const pixel = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;

  const primeiroNome = evento.nome_pessoa?.trim().split(/\s+/)[0];
  const user_data: Record<string, unknown> = {
    ...(evento.email ? { em: [sha256(evento.email)] } : {}),
    ...(evento.telefone ? { ph: [sha256(telefoneE164(evento.telefone))] } : {}),
    ...(primeiroNome ? { fn: [sha256(primeiroNome)] } : {}),
    ...(evento.idExterno ? { external_id: [sha256(evento.idExterno)] } : {}),
    ...(evento.ip ? { client_ip_address: evento.ip } : {}),
    ...(evento.userAgent ? { client_user_agent: evento.userAgent } : {}),
    ...(evento.fbp ? { fbp: evento.fbp } : {}),
    ...(evento.fbc ? { fbc: evento.fbc } : {}),
    country: [sha256("br")],
  };

  const corpo = {
    data: [
      {
        event_name: evento.nome,
        event_time: Math.floor(Date.now() / 1000),
        event_id: evento.eventId,
        action_source: evento.origem ?? "website",
        ...(evento.url ? { event_source_url: evento.url } : {}),
        user_data,
        ...(evento.valor !== undefined ? { custom_data: { value: evento.valor, currency: evento.moeda ?? "BRL" } } : {}),
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };

  const resposta = await fetch(`https://graph.facebook.com/${VERSAO_API}/${pixel}/events?access_token=${encodeURIComponent(token!)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(8000),
  });
  if (!resposta.ok) {
    throw new Error(`Meta CAPI ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`);
  }
}
