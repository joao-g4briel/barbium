import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { notificacoesConfiguradas } from "@/lib/notificacoes";
import { enviarLembretesPendentes } from "@/lib/lembretes";
import { sincronizarCartoesPendentes } from "@/lib/planos-corte";
import { enviarAvisosDeRenovacao } from "@/lib/avisos-plano";

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

  // Planos de corte: primeiro confere as cobranças do cartão (quem já renovou
  // não recebe aviso), depois o "seu plano vence em breve". Uma falha aqui
  // não derruba os lembretes, que já saíram.
  const cartoes = await sincronizarCartoesPendentes().catch((erro) => {
    console.error("Planos (cartão):", erro instanceof Error ? erro.message : erro);
    return null;
  });
  const renovacao = await enviarAvisosDeRenovacao().catch((erro) => {
    console.error("Planos (aviso de renovação):", erro instanceof Error ? erro.message : erro);
    return null;
  });
  return NextResponse.json({ ...resultado, planos: { cartoes, renovacao } });
}
