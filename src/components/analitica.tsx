"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Contagem de visitas da Vercel (sem cookies). Antes de enviar, tira do
// endereço o que é segredo: o código do link do cliente (/meu-horario/<código>)
// e o token de redefinir senha. Da busca, só ficam as marcas de campanha (utm_*).
export function limparEndereco(url: string): string {
  const u = new URL(url);
  u.pathname = u.pathname.replace(/^\/meu-horario\/[^/]+/, "/meu-horario/[codigo]");
  for (const chave of [...u.searchParams.keys()]) {
    if (!chave.startsWith("utm_")) u.searchParams.delete(chave);
  }
  u.hash = "";
  return u.toString();
}

function antesDeEnviar(evento: BeforeSendEvent): BeforeSendEvent {
  return { ...evento, url: limparEndereco(evento.url) };
}

export function Analitica() {
  return <Analytics beforeSend={antesDeEnviar} />;
}
