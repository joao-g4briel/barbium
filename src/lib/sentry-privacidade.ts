import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

// O que vai para o Sentry passa por aqui antes (beforeSend/beforeBreadcrumb
// nas três configurações: navegador, servidor e edge). Os links do cliente
// carregam um código que dá acesso sem login (meu horário, minha assinatura)
// e o de redefinir senha leva um token: nada disso pode sair do sistema.
// Cookies, cabeçalhos de autenticação e o IP também não vão
// (sendDefaultPii: false cuida do IP; aqui, do resto).

const PADROES: [RegExp, string][] = [
  [/(\/meu-horario\/)[^/?#\s"'<>]+/g, "$1:codigo"],
  [/(\/minha-assinatura\/)[^/?#\s"'<>]+/g, "$1:codigo"],
  [/([?&](?:token|codigo|code)=)[^&#\s"'<>]+/gi, "$1:oculto"],
];

export function limparTexto(texto: string): string {
  let saida = texto;
  for (const [padrao, troca] of PADROES) saida = saida.replace(padrao, troca);
  return saida;
}

function limparValor<T>(valor: T): T {
  return (typeof valor === "string" ? limparTexto(valor) : valor) as T;
}

const CABECALHOS_SENSIVEIS = new Set(["cookie", "authorization", "set-cookie", "x-forwarded-for", "x-real-ip"]);

export function limparEvento(evento: ErrorEvent): ErrorEvent {
  if (evento.request) {
    const req = evento.request;
    req.url = limparValor(req.url);
    // A query vem sem o "?" na frente; em outro formato (objeto), não vai.
    req.query_string = typeof req.query_string === "string" ? limparTexto(`?${req.query_string}`).slice(1) : undefined;
    delete req.cookies;
    delete req.data;
    if (req.headers) {
      for (const nome of Object.keys(req.headers)) {
        if (CABECALHOS_SENSIVEIS.has(nome.toLowerCase())) delete req.headers[nome];
        else req.headers[nome] = limparTexto(req.headers[nome]);
      }
    }
  }
  evento.transaction = limparValor(evento.transaction);
  for (const ex of evento.exception?.values ?? []) ex.value = limparValor(ex.value);
  if (evento.message) evento.message = limparTexto(evento.message);
  if (evento.tags?.url) evento.tags.url = limparValor(evento.tags.url);
  evento.breadcrumbs = evento.breadcrumbs?.map(limparMigalha);
  return evento;
}

export function limparMigalha(migalha: Breadcrumb): Breadcrumb {
  if (migalha.message) migalha.message = limparTexto(migalha.message);
  if (migalha.data) {
    for (const chave of ["url", "to", "from"]) {
      if (typeof migalha.data[chave] === "string") migalha.data[chave] = limparTexto(migalha.data[chave]);
    }
  }
  return migalha;
}

// Opções comuns às três configurações.
export const OPCOES_SENTRY = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Só no build de produção e com a chave configurada (na Vercel). Sem a
  // chave, o Sentry fica desligado e nada sai do sistema.
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "development",
  // Só erros: sem medição de desempenho nem gravação de tela.
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: (evento: ErrorEvent) => limparEvento(evento),
  beforeBreadcrumb: (migalha: Breadcrumb) => limparMigalha(migalha),
};
