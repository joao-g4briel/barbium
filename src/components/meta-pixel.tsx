"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Pixel da Meta (Facebook/Instagram Ads). Só roda nas páginas de marketing e
// cadastro: painel, agendamento público e "meu horário" ficam de fora, pra não
// misturar os clientes das barbearias com o público dos anúncios do Barbium.
// Sem NEXT_PUBLIC_META_PIXEL_ID, nada é carregado.

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const FORA = ["/painel", "/agendar", "/meu-horario", "/super-admin", "/login", "/recuperar-senha", "/redefinir-senha"];

type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export function pixelAtivoEm(caminho: string): boolean {
  return Boolean(PIXEL_ID) && !FORA.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

// Dispara um evento no navegador. O eventID é o mesmo mandado pelo servidor
// (API de Conversões), assim a Meta conta uma vez só.
export function rastrearMeta(evento: string, dados?: Record<string, unknown>, eventId?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", evento, dados ?? {}, eventId ? { eventID: eventId } : undefined);
}

export function MetaPixel() {
  const caminho = usePathname() ?? "/";
  const ativo = pixelAtivoEm(caminho);
  const primeiro = useRef(true);

  // PageView a cada troca de página (o primeiro sai no próprio script).
  useEffect(() => {
    if (!ativo) return;
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [caminho, ativo]);

  if (!ativo) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}
