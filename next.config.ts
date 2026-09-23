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
};

export default nextConfig;
