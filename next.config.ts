import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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