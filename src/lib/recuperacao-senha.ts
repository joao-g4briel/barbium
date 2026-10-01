import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { enviarEmail } from "./email";

export const VALIDADE_LINK_MINUTOS = 60;
// Pedidos repetidos pro mesmo e-mail dentro desse intervalo são ignorados.
export const INTERVALO_ENTRE_PEDIDOS_SEGUNDOS = 120;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function gerarToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

// Token existente, não usado, dentro da validade, de usuário ativo.
export async function buscarTokenValido(token: string) {
  if (!token || token.length > 200) return null;
  const registro = await prisma.tokenRedefinicaoSenha.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
  });
  if (!registro || registro.usadoEm || registro.expiraEm < new Date() || !registro.usuario.ativo) return null;
  return registro;
}

// Roda depois da resposta (ver a rota): cria o link e manda o e-mail, se o
// e-mail for de um usuário ativo e não houver pedido recente.
export async function processarPedidoDeRedefinicao(email: string, urlBase: string): Promise<void> {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, nome: true, email: true, ativo: true },
  });
  if (!usuario || !usuario.ativo) return;

  const recente = await prisma.tokenRedefinicaoSenha.findFirst({
    where: { usuarioId: usuario.id, criadoEm: { gt: new Date(Date.now() - INTERVALO_ENTRE_PEDIDOS_SEGUNDOS * 1000) } },
    select: { id: true },
  });
  if (recente) return;

  // Faxina: links vencidos ou já usados desse usuário não servem pra nada.
  await prisma.tokenRedefinicaoSenha.deleteMany({
    where: { usuarioId: usuario.id, OR: [{ expiraEm: { lt: new Date() } }, { usadoEm: { not: null } }] },
  });

  const { token, hash } = gerarToken();
  await prisma.tokenRedefinicaoSenha.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hash,
      expiraEm: new Date(Date.now() + VALIDADE_LINK_MINUTOS * 60 * 1000),
    },
  });

  const link = `${urlBase}/redefinir-senha?token=${encodeURIComponent(token)}`;
  const { assunto, html, texto } = montarEmailRedefinicao(usuario.nome, link);
  await enviarEmail({ para: usuario.email, assunto, html, texto });
}

// Endereço público do app pros links do e-mail. Em produção vem só da
// variável APP_URL — nunca do cabeçalho Host da requisição, que um atacante
// pode forjar pra fazer o link do e-mail apontar pro site dele.
export function urlDoApp(origemDaRequisicao: string): string | null {
  const configurada = process.env.APP_URL?.replace(/\/+$/, "");
  if (configurada) return configurada;
  return process.env.NODE_ENV === "production" ? null : origemDaRequisicao;
}

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function montarEmailRedefinicao(nome: string, link: string) {
  const primeiroNome = escaparHtml(nome.split(" ")[0] ?? nome);
  const assunto = "Redefinir sua senha do Barbium";
  const texto = [
    `Olá, ${nome.split(" ")[0] ?? nome}.`,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta no Barbium.",
    `Abra o link abaixo para escolher uma nova senha. Ele vale por ${VALIDADE_LINK_MINUTOS} minutos e só pode ser usado uma vez:`,
    "",
    link,
    "",
    "Se não foi você que pediu, ignore este e-mail. Sua senha continua a mesma.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f7f5;font-family:Manrope,sans-serif;color:#0d1110">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <p style="margin:0 0 24px;font-size:20px;font-weight:800">barbium</p>
      <p style="margin:0 0 16px;font-size:16px">Olá, ${primeiroNome}.</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5">
        Recebemos um pedido para redefinir a senha da sua conta no Barbium.
      </p>
      <p style="margin:24px 0">
        <a href="${escaparHtml(link)}"
           style="display:inline-block;background:#4ade80;color:#0d1110;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">
          Escolher nova senha
        </a>
      </p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#4b5650">
        O link vale por ${VALIDADE_LINK_MINUTOS} minutos e só pode ser usado uma vez.
        Se não foi você que pediu, ignore este e-mail. Sua senha continua a mesma.
      </p>
      <p style="margin:0;font-size:12px;color:#4b5650;word-break:break-all">${escaparHtml(link)}</p>
    </div>
  </body>
</html>`;

  return { assunto, html, texto };
}
