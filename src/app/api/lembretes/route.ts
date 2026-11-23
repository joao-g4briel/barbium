import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { notificacoesConfiguradas } from "@/lib/notificacoes";
import { enviarLembretesPendentes } from "@/lib/lembretes";

// Chamada pelo n8n a cada 15 minutos (fluxo em docs/n8n/barbium-lembretes.json)
// para mandar os lembretes que estão na hora. Protegida pelo mesmo segredo do
// webhook de avisos (N8N_WEBHOOK_TOKEN), no cabeçalho x-barbium-token.

export const dynamic = "force-dynamic";

function tokenConfere(recebido: string | null): boolean {
  const esperado = process.env.N8N_WEBHOOK_TOKEN;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!tokenConfere(request.headers.get("x-barbium-token"))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  // Sem webhook configurado não há como mandar: nada é marcado como enviado.
  if (!notificacoesConfiguradas()) {
    return NextResponse.json({ erro: "N8N_WEBHOOK_URL não configurada." }, { status: 503 });
  }

  const resultado = await enviarLembretesPendentes();
  return NextResponse.json(resultado);
}
