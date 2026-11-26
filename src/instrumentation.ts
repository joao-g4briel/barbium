import type { Instrumentation } from "next";

// Liga o Sentry no servidor (Node). Sem NEXT_PUBLIC_SENTRY_DSN ele fica
// desligado (ver lib/sentry-privacidade). Fica fora do edge (middleware), que
// só confere o login: lá ele dobraria o tamanho do pacote.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
}

// O Next chama isto para todo erro não tratado no servidor (páginas, rotas
// de API, middleware). Registra no Sentry (histórico e agrupamento) e avisa
// no WhatsApp da plataforma (ver lib/alerta-erro).
//
// Este arquivo também é compilado para o runtime edge (middleware), que não
// tem banco nem módulos do Node. O import fica dentro do if com
// NEXT_RUNTIME === "nodejs" pra o Next tirar esse trecho do pacote edge.
export const onRequestError: Instrumentation.onRequestError = async (erro, request, contexto) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureRequestError(erro, request, contexto);
    } catch (falha) {
      console.error("Sentry:", falha instanceof Error ? falha.message : falha);
    }
    try {
      const { alertarErro } = await import("./lib/alerta-erro");
      // routePath (ex.: /painel/clientes/[id]) em vez do caminho real: não leva
      // ids nem parâmetros da URL pra mensagem, e agrupa o mesmo erro.
      await alertarErro(erro, `${request.method} ${contexto.routePath}`, (erro as { digest?: string }).digest);
    } catch (falha) {
      console.error("Alerta de erro:", falha instanceof Error ? falha.message : falha);
    }
  }
};
