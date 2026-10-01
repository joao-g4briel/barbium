import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Cifra credenciais de terceiros (ex.: token do Mercado Pago) antes de ir pro
// banco. A chave fica só no ambiente: SEGREDOS_CHAVE = 32 bytes em base64
// (gere com: openssl rand -base64 32). Sem a chave o banco sozinho não
// revela o token.

export class ChaveSegredosAusente extends Error {
  constructor() {
    super("SEGREDOS_CHAVE não configurada.");
  }
}

function chave(): Buffer {
  const valor = process.env.SEGREDOS_CHAVE;
  if (!valor) throw new ChaveSegredosAusente();
  const bytes = Buffer.from(valor, "base64");
  if (bytes.length !== 32) throw new Error("SEGREDOS_CHAVE precisa ter 32 bytes em base64.");
  return bytes;
}

export function chaveSegredosConfigurada(): boolean {
  try {
    chave();
    return true;
  } catch {
    return false;
  }
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chave(), iv);
  const conteudo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), conteudo.toString("base64")].join(":");
}

export function decifrar(valor: string): string {
  const [versao, iv, tag, conteudo] = valor.split(":");
  if (versao !== "v1" || !iv || !tag || !conteudo) throw new Error("Segredo em formato desconhecido.");
  const decifra = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  decifra.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decifra.update(Buffer.from(conteudo, "base64")), decifra.final()]).toString("utf8");
}
