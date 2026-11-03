import "server-only";
import { prisma } from "./prisma";

export const MENSAGEM_LIMITE = "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";

// Conta uma tentativa para a chave e diz se ainda está dentro do limite.
// Janela fixa: a primeira tentativa abre a janela, e ela recomeça do zero
// quando expira. Um único INSERT ... ON CONFLICT faz a conta no banco, então
// pedidos simultâneos não escapam do limite lendo o mesmo valor.
// Horários em UTC, como o Prisma grava as colunas TIMESTAMP.
export async function consumirTentativa(chave: string, maximo: number, janelaSegundos: number): Promise<boolean> {
  const [linha] = await prisma.$queryRaw<{ contagem: number }[]>`
    INSERT INTO "limites_tentativas" ("chave", "contagem", "expiraEm")
    VALUES (${chave}, 1, (now() AT TIME ZONE 'UTC') + interval '1 second' * ${janelaSegundos}::int)
    ON CONFLICT ("chave") DO UPDATE SET
      "contagem" = CASE WHEN "limites_tentativas"."expiraEm" < (now() AT TIME ZONE 'UTC')
        THEN 1 ELSE "limites_tentativas"."contagem" + 1 END,
      "expiraEm" = CASE WHEN "limites_tentativas"."expiraEm" < (now() AT TIME ZONE 'UTC')
        THEN EXCLUDED."expiraEm" ELSE "limites_tentativas"."expiraEm" END
    RETURNING "contagem"`;

  // Faxina de vez em quando, pra tabela não crescer com chave que não volta.
  if (Math.random() < 0.02) {
    await prisma.limiteTentativa.deleteMany({ where: { expiraEm: { lt: new Date() } } }).catch(() => {});
  }

  return Number(linha.contagem) <= maximo;
}

// Confere várias chaves de uma vez (ex.: por IP e por e-mail). Todas contam a
// tentativa, mesmo que a primeira já tenha estourado.
export async function dentroDosLimites(
  regras: { chave: string; maximo: number; janelaSegundos: number }[],
): Promise<boolean> {
  const resultados = await Promise.all(regras.map((r) => consumirTentativa(r.chave, r.maximo, r.janelaSegundos)));
  return resultados.every(Boolean);
}

export async function zerarTentativas(chave: string): Promise<void> {
  await prisma.limiteTentativa.deleteMany({ where: { chave } });
}

// Na Vercel o x-forwarded-for é preenchido pela própria plataforma (o primeiro
// endereço é o do cliente). Sem ele (ex.: local), tudo cai numa chave só.
export function ipDaRequisicao(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || request.headers.get("x-real-ip") || "desconhecido";
}
