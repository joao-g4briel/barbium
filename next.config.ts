import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sem isso, o Next reaproveita em cache páginas que só mudam por
  // parâmetro de URL (?data=..., ?visualizacao=...) — clicar em
  // "Próximo"/"Anterior" muda a URL e o servidor recalcula certinho, mas a
  // tela continua mostrando a versão anterior. Isso desliga esse cache
  // pras páginas dinâmicas do painel.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  // O webpack do Next tenta empacotar "ws" (usado pelo driver do Neon) e
  // corrompe seu binário nativo, causando "bufferUtil.mask is not a
  // function". Isso diz pro Next deixar esses pacotes de fora do bundle.
  serverExternalPackages: [
    "@neondatabase/serverless",
    "ws",
    "bufferutil",
    "utf-8-validate",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Painel, login e super admin não podem ser abertos dentro de um iframe
      // de outro site (clickjacking: o usuário clica achando que está em
      // outra página). A página pública de agendamento fica de fora, pra
      // poder ser embutida no site da barbearia.
      {
        source: "/((?!agendar/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
