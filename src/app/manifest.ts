import type { MetadataRoute } from "next";

// Servido em /manifest.webmanifest (referenciado no layout raiz). Sem ele o
// navegador não oferece a instalação do app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Barbium",
    short_name: "Barbium",
    description: "Agenda, clientes e caixa da sua barbearia em um só lugar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f8",
    theme_color: "#f5f7f8",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
