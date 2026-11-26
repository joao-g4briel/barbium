import { NextResponse } from "next/server";
import { exigirDono } from "@/lib/equipe";
import { chaveSegredosConfigurada } from "@/lib/segredos";
import {
  COOKIE_ESTADO_OAUTH,
  VALIDADE_ESTADO_SEGUNDOS,
  novoEstadoOAuth,
  oauthConfigurado,
  urlDeAutorizacao,
  urlDeRetornoOAuth,
} from "@/lib/mercadopago-oauth";
import { pixPendentesMercadoPago } from "@/lib/sinal";
import { prisma } from "@/lib/prisma";

// Botão "Conectar com Mercado Pago": leva o dono para a página de
// autorização do Mercado Pago. A volta é em /api/mercadopago/oauth/retorno.
export async function GET(request: Request) {
  const voltar = (resultado: string) =>
    NextResponse.redirect(new URL(`/painel/configuracoes?mp=${resultado}#titulo-pagamento`, request.url));

  const sessao = await exigirDono();
  if (!sessao) return voltar("sem-permissao");
  const urlRetorno = urlDeRetornoOAuth();
  if (!oauthConfigurado() || !urlRetorno) return voltar("indisponivel");
  if (!chaveSegredosConfigurada()) return voltar("sem-chave");

  // Já conectado: trocar de conta com Pix aberto deixaria esse Pix sem conferência.
  const atual = await prisma.configuracaoPagamento.findUnique({
    where: { barbeariaId: sessao.barbeariaId! },
    select: { mpAccessTokenCifrado: true },
  });
  if (atual?.mpAccessTokenCifrado && (await pixPendentesMercadoPago(sessao.barbeariaId!)) > 0) return voltar("pix-pendente");

  const { estado, cookie } = novoEstadoOAuth(sessao.barbeariaId!, sessao.sub);
  const resposta = NextResponse.redirect(urlDeAutorizacao(estado, urlRetorno));
  resposta.cookies.set(COOKIE_ESTADO_OAUTH, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/mercadopago/oauth",
    maxAge: VALIDADE_ESTADO_SEGUNDOS,
  });
  return resposta;
}
