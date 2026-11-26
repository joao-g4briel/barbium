import { NextResponse, type NextRequest } from "next/server";
import { exigirDono } from "@/lib/equipe";
import { prisma } from "@/lib/prisma";
import { cifrar } from "@/lib/segredos";
import { verificarToken } from "@/lib/mercadopago";
import { COOKIE_ESTADO_OAUTH, lerEstadoOAuth, trocarCodigoPorToken, urlDeRetornoOAuth } from "@/lib/mercadopago-oauth";
import { pixPendentesMercadoPago } from "@/lib/sinal";

// Volta do Mercado Pago depois de o dono autorizar (ou recusar). Confere o
// estado da tentativa (cookie assinado + parâmetro "state") e se quem voltou é
// o mesmo dono da mesma barbearia; troca o código pelo token e guarda cifrado.
export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const voltar = (resultado: string) => {
    const resposta = NextResponse.redirect(new URL(`/painel/configuracoes?mp=${resultado}#titulo-pagamento`, request.url));
    resposta.cookies.set(COOKIE_ESTADO_OAUTH, "", { path: "/api/mercadopago/oauth", maxAge: 0 });
    return resposta;
  };

  const estado = lerEstadoOAuth(request.cookies.get(COOKIE_ESTADO_OAUTH)?.value, parametros.get("state"));
  if (!estado) return voltar("expirado");
  const sessao = await exigirDono();
  if (!sessao || sessao.barbeariaId !== estado.barbeariaId || sessao.sub !== estado.usuarioId) return voltar("sem-permissao");

  const codigo = parametros.get("code");
  if (!codigo) return voltar(parametros.get("error") ? "cancelado" : "erro");
  const urlRetorno = urlDeRetornoOAuth();
  if (!urlRetorno) return voltar("indisponivel");

  let credenciais;
  try {
    credenciais = await trocarCodigoPorToken(codigo, urlRetorno);
  } catch (erro) {
    console.error("OAuth do Mercado Pago:", erro instanceof Error ? erro.message : erro);
    return voltar("erro");
  }
  const conta = await verificarToken(credenciais.accessToken).catch(() => null);
  const usuarioId = credenciais.usuarioId || (conta ? String(conta.id) : "");

  const barbeariaId = estado.barbeariaId;
  const atual = await prisma.configuracaoPagamento.findUnique({
    where: { barbeariaId },
    select: { mpAccessTokenCifrado: true, mpUsuarioId: true },
  });
  // Outra conta com Pix aberto na anterior: esse Pix ficaria sem conferência.
  if (atual?.mpAccessTokenCifrado && atual.mpUsuarioId !== usuarioId && (await pixPendentesMercadoPago(barbeariaId)) > 0) {
    return voltar("pix-pendente");
  }

  const valores = {
    mpAccessTokenCifrado: cifrar(credenciais.accessToken),
    mpRefreshTokenCifrado: cifrar(credenciais.refreshToken),
    mpTokenExpiraEm: credenciais.expiraEm,
    mpUsuarioId: usuarioId || null,
    mpContaDescricao: conta?.descricao ?? (usuarioId ? `Conta ${usuarioId}` : "Conta do Mercado Pago"),
  };
  await prisma.configuracaoPagamento.upsert({
    where: { barbeariaId },
    update: valores,
    create: { barbeariaId, ...valores },
  });
  return voltar("conectado");
}
