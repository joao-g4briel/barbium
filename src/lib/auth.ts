import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const COOKIE_NAME = "barbium_session";

export const OPCOES_COOKIE_SESSAO = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 dias, em segundos (mesma validade do token)
};

const alg = "HS256";

function getSecret() {
  const segredo = process.env.JWT_SECRET;
  if (!segredo) {
    throw new Error("JWT_SECRET não configurado.");
  }
  return new TextEncoder().encode(segredo);
}

export type PapelUsuario = "SUPER_ADMIN" | "DONO" | "BARBEIRO";

export interface SessaoPayload {
  sub: string; // id do usuário
  nome: string;
  role: PapelUsuario;
  barbeariaId: string | null;
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function verificarSenha(
  senha: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function criarTokenSessao(
  payload: SessaoPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verificarTokenSessao(
  token: string,
): Promise<SessaoPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessaoPayload;
  } catch {
    return null;
  }
}

// Gera uma senha temporária legível (ex.: para o dono de uma barbearia
// recém-criada pelo super admin), sem caracteres ambíguos como 0/O, 1/l/I.
// Usa o gerador criptográfico (Web Crypto, disponível no Node e no Edge) e
// descarta bytes acima do maior múltiplo do alfabeto, pra não enviesar letras.
export function gerarSenhaTemporaria(): string {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const limite = 256 - (256 % alfabeto.length);
  let senha = "";
  while (senha.length < 10) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const byte of bytes) {
      if (byte < limite && senha.length < 10) senha += alfabeto[byte % alfabeto.length];
    }
  }
  return senha;
}
