import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pasta do build. Só muda quando NEXT_DIST_DIR é passada: permite rodar um
  // segundo servidor de testes sem disputar a .next do servidor em uso (dois
  // servidores na mesma pasta corrompem os arquivos um do outro). Com outra
  // pasta, o Next acrescenta ela ao tsconfig.json e ao next-env.d.ts:
  // desfaça essas mudanças depois (git checkout -- tsconfig.json next-env.d.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
  // As imagens de prévia (opengraph-image) leem as fontes de assets/fontes
  // em tempo de execução; isso garante que elas vão junto no deploy.
  outputFileTracingIncludes: {
    "/previa.png": ["./assets/fontes/**/*"],
    "/agendar/[slug]/opengraph-image": ["./assets/fontes/**/*"],
  },
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

// Sentry: com SENTRY_AUTH_TOKEN (e SENTRY_ORG/SENTRY_PROJECT) na Vercel, o
// build envia os source maps (o erro aparece com o arquivo e a linha do
// código) e os apaga do site depois. Sem o token, nada é enviado. Os eventos
// passam por /monitoramento, no próprio domínio, para bloqueadores de anúncio
// não derrubarem o registro.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoramento",
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  // Só erros: sem medição de desempenho nem gravação de tela, e sem embrulhar
  // middleware, rotas e páginas (o onRequestError já registra os erros do
  // servidor). Mantém o pacote do site e do middleware do tamanho de antes.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
  webpack: { autoInstrumentMiddleware: false, autoInstrumentServerFunctions: false, autoInstrumentAppDirectory: false },
});
