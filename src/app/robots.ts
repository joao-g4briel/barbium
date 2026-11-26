import type { MetadataRoute } from "next";
import { urlPublicaDoApp } from "@/lib/link-cliente";

// Buscadores: a landing, as páginas legais e os links de agendamento das
// barbearias podem aparecer; painel, API e os links assinados do cliente
// (meu horário, minha assinatura, redefinir senha) ficam de fora.
export default function robots(): MetadataRoute.Robots {
  const base = urlPublicaDoApp();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/painel", "/super-admin", "/api/", "/meu-horario/", "/minha-assinatura/", "/recuperar-senha", "/redefinir-senha"],
    },
    ...(base ? { sitemap: `${base}/sitemap.xml`, host: base } : {}),
  };
}
