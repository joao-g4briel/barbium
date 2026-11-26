import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { urlPublicaDoApp } from "./link-cliente";

// "Conectar com Mercado Pago" (OAuth): o dono entra na conta dele no Mercado
// Pago e autoriza o Barbium; o Mercado Pago devolve um código, que o servidor
// troca por um token de 180 dias e um refresh token para renovar. O dono nunca
// vê nem copia token. Precisa da aplicação do Barbium no painel de
// desenvolvedor do Mercado Pago (MERCADOPAGO_CLIENT_ID e
// MERCADOPAGO_CLIENT_SECRET), com a URL de retorno cadastrada igualzinha.
//
// MERCADOPAGO_AUTH_URL e MERCADOPAGO_API_URL existem só para apontar para um
// servidor falso em teste.
const AUTORIZACAO = process.env.MERCADOPAGO_AUTH_URL ?? "https://auth.mercadopago.com/authorization";
const API = process.env.MERCADOPAGO_API_URL ?? "https://api.mercadopago.com";

export const COOKIE_ESTADO_OAUTH = "mp_oauth";
export const VALIDADE_ESTADO_SEGUNDOS = 10 * 60;

export function oauthConfigurado(): boolean {
  return Boolean(process.env.MERCADOPAGO_CLIENT_ID && process.env.MERCADOPAGO_CLIENT_SECRET);
}

// Endereço para onde o Mercado Pago devolve o dono. Tem de ser idêntico ao
// cadastrado na aplicação (por isso nunca vem do cabeçalho da requisição).
export function urlDeRetornoOAuth(): string | null {
  const base = urlPublicaDoApp();
  return base ? `${base}/api/mercadopago/oauth/retorno` : null;
}

export function urlDeAutorizacao(estado: string, urlRetorno: string): string {
  const url = new URL(AUTORIZACAO);
  url.searchParams.set("client_id", process.env.MERCADOPAGO_CLIENT_ID ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("state", estado);
  url.searchParams.set("redirect_uri", urlRetorno);
  return url.toString();
}

// --- Estado da tentativa (protege contra quem tenta encaixar a conta dele
// na barbearia de outra pessoa): vai num cookie assinado e precisa voltar
// igual no parâmetro "state".

interface EstadoOAuth {
  estado: string;
  barbeariaId: string;
  usuarioId: string;
  expiraEm: number;
}

function segredo(): string {
  const valor = process.env.JWT_SECRET;
  if (!valor) throw new Error("JWT_SECRET não configurado.");
  return valor;
}

function assinatura(texto: string): string {
  return createHmac("sha256", segredo()).update(`mp-oauth:${texto}`).digest("base64url");
}

export function novoEstadoOAuth(barbeariaId: string, usuarioId: string): { estado: string; cookie: string } {
  const dados: EstadoOAuth = {
    estado: randomBytes(24).toString("base64url"),
    barbeariaId,
    usuarioId,
    expiraEm: Date.now() + VALIDADE_ESTADO_SEGUNDOS * 1000,
  };
  const corpo = Buffer.from(JSON.stringify(dados)).toString("base64url");
  return { estado: dados.estado, cookie: `${corpo}.${assinatura(corpo)}` };
}

export function lerEstadoOAuth(cookie: string | undefined, estadoRecebido: string | null): EstadoOAuth | null {
  if (!cookie || !estadoRecebido) return null;
  const [corpo, assinado, ...resto] = cookie.split(".");
  if (!corpo || !assinado || resto.length) return null;
  const esperado = Buffer.from(assinatura(corpo));
  const recebido = Buffer.from(assinado);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as EstadoOAuth;
    if (dados.expiraEm < Date.now()) return null;
    const a = Buffer.from(dados.estado);
    const b = Buffer.from(estadoRecebido);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return dados;
  } catch {
    return null;
  }
}

// --- Tokens ---------------------------------------------------------------

export class ErroOAuth extends Error {
  constructor(
    mensagem: string,
    public readonly status: number,
    public readonly codigo: string | null,
  ) {
    super(mensagem);
  }
}

export interface CredenciaisOAuth {
  accessToken: string;
  refreshToken: string;
  expiraEm: Date;
  usuarioId: string;
}

async function pedirToken(corpo: Record<string, string>): Promise<CredenciaisOAuth> {
  const resposta = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.MERCADOPAGO_CLIENT_ID,
      client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
      ...corpo,
    }),
    cache: "no-store",
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok || !dados?.access_token || !dados?.refresh_token) {
    throw new ErroOAuth(dados?.message ?? `Mercado Pago respondeu ${resposta.status}.`, resposta.status, dados?.error ?? null);
  }
  const segundos = Number(dados.expires_in) > 0 ? Number(dados.expires_in) : 180 * 24 * 60 * 60;
  return {
    accessToken: String(dados.access_token),
    refreshToken: String(dados.refresh_token),
    expiraEm: new Date(Date.now() + segundos * 1000),
    usuarioId: String(dados.user_id ?? ""),
  };
}

export function trocarCodigoPorToken(codigo: string, urlRetorno: string): Promise<CredenciaisOAuth> {
  return pedirToken({ grant_type: "authorization_code", code: codigo, redirect_uri: urlRetorno });
}

// Cada renovação devolve também um refresh token novo: o antigo deixa de valer.
export function renovarToken(refreshToken: string): Promise<CredenciaisOAuth> {
  return pedirToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}
