import type { MetadataRoute } from "next";
import { urlPublicaDoApp } from "@/lib/link-cliente";

// Só as páginas públicas do Barbium. Os links de agendamento das barbearias
// ficam de fora: cada barbearia decide onde divulgar o próprio link.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlPublicaDoApp() ?? "http://localhost:3000";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cadastro`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
