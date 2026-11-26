import { OPCOES_SENTRY } from "./lib/sentry-privacidade";

// Sentry no navegador: registra erros que acontecem no aparelho de quem usa
// (o servidor não vê esses). Desligado sem NEXT_PUBLIC_SENTRY_DSN; sem
// gravação de tela nem medição de desempenho (ver lib/sentry-privacidade).
//
// O SDK é baixado só depois que a página terminou de carregar, num arquivo à
// parte: importado aqui direto, ele somaria uns 70 kB a toda página, landing
// inclusive. Um erro antes do fim do carregamento fica de fora; é a troca.
function iniciar() {
  void import("@sentry/nextjs").then((Sentry) => Sentry.init(OPCOES_SENTRY));
}

if (OPCOES_SENTRY.enabled && typeof window !== "undefined") {
  if (document.readyState === "complete") setTimeout(iniciar, 0);
  else window.addEventListener("load", () => setTimeout(iniciar, 0), { once: true });
}
