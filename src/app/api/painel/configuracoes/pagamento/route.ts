import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/equipe";
import { ChaveSegredosAusente, cifrar } from "@/lib/segredos";
import { verificarToken } from "@/lib/mercadopago";
import { normalizarChave, textoDoCodigo, type TipoChave } from "@/lib/pix-brcode";
import { SINAL_PERCENTUAL_MAX, SINAL_PERCENTUAL_MIN, SINAL_RESERVA_MINUTOS, pixPendentesMercadoPago } from "@/lib/sinal";

const TIPOS_CHAVE = ["CPF", "CNPJ", "TELEFONE", "EMAIL", "ALEATORIA"] as const;

const corpoSchema = z.object({
  sinalAtivo: z.boolean(),
  sinalPercentual: z.number().int().min(SINAL_PERCENTUAL_MIN).max(SINAL_PERCENTUAL_MAX),
  // Token colado à mão (opção avançada; o normal é o botão de conectar).
  accessToken: z.string().trim().min(1).optional(),
  // Chave Pix da barbearia: null apaga; ausente mantém.
  chavePix: z
    .object({ tipo: z.enum(TIPOS_CHAVE), chave: z.string().trim().min(1).max(120), cidade: z.string().trim().max(60) })
    .nullable()
    .optional(),
});

function respostaPixPendentes(quantidade: number, acao: string) {
  return NextResponse.json(
    {
      erro: `${quantidade === 1 ? "Há 1 Pix do Mercado Pago" : `Há ${quantidade} Pix do Mercado Pago`} aguardando pagamento. Para ${acao}, espere ${quantidade === 1 ? "ele ser pago ou vencer" : "eles serem pagos ou vencerem"} (no máximo ${SINAL_RESERVA_MINUTOS} minutos).`,
    },
    { status: 409 },
  );
}

export async function PUT(request: Request) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  const barbeariaId = sessao.barbeariaId!;

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json(
      { erro: `Confira os dados. O percentual vai de ${SINAL_PERCENTUAL_MIN}% a ${SINAL_PERCENTUAL_MAX}%.` },
      { status: 400 },
    );
  }

  const atual = await prisma.configuracaoPagamento.findUnique({
    where: { barbeariaId },
    select: { mpAccessTokenCifrado: true, mpTokenExpiraEm: true, pixChave: true },
  });

  let credenciais: Record<string, string | Date | null> | null = null;
  if (dados.data.accessToken) {
    if (atual?.mpAccessTokenCifrado) {
      const pendentes = await pixPendentesMercadoPago(barbeariaId);
      if (pendentes > 0) return respostaPixPendentes(pendentes, "trocar o token");
    }
    let conta;
    try {
      conta = await verificarToken(dados.data.accessToken);
    } catch {
      return NextResponse.json(
        { erro: "O Mercado Pago recusou esse Access Token. Confira se copiou o token de produção completo." },
        { status: 400 },
      );
    }
    try {
      // Token colado à mão não tem renovação: apaga os dados do botão.
      credenciais = {
        mpAccessTokenCifrado: cifrar(dados.data.accessToken),
        mpContaDescricao: conta.descricao,
        mpRefreshTokenCifrado: null,
        mpTokenExpiraEm: null,
        mpUsuarioId: String(conta.id),
      };
    } catch (erro) {
      if (erro instanceof ChaveSegredosAusente) {
        return NextResponse.json(
          { erro: "O servidor ainda não tem a chave para guardar o token com segurança (SEGREDOS_CHAVE)." },
          { status: 500 },
        );
      }
      throw erro;
    }
  }

  let chave: { pixTipoChave: TipoChave | null; pixChave: string | null; pixCidade: string | null } | null = null;
  if (dados.data.chavePix === null) {
    chave = { pixTipoChave: null, pixChave: null, pixCidade: null };
  } else if (dados.data.chavePix) {
    const { tipo, cidade } = dados.data.chavePix;
    const normalizada = normalizarChave(tipo, dados.data.chavePix.chave);
    if (!normalizada) {
      const exemplo: Record<TipoChave, string> = {
        CPF: "um CPF válido",
        CNPJ: "um CNPJ válido",
        TELEFONE: "um celular com DDD, como (81) 99999-8888",
        EMAIL: "um e-mail válido",
        ALEATORIA: "a chave aleatória completa (36 caracteres)",
      };
      return NextResponse.json({ erro: `Chave Pix inválida: informe ${exemplo[tipo]}.`, campo: "chavePix" }, { status: 400 });
    }
    if (!textoDoCodigo(cidade, 15)) {
      return NextResponse.json({ erro: "Informe a cidade da barbearia (vai no código do Pix).", campo: "cidadePix" }, { status: 400 });
    }
    chave = { pixTipoChave: tipo, pixChave: normalizada, pixCidade: cidade };
  }

  const temMercadoPago = Boolean(credenciais) || Boolean(atual?.mpAccessTokenCifrado && (!atual.mpTokenExpiraEm || atual.mpTokenExpiraEm > new Date()));
  const temChave = chave ? Boolean(chave.pixChave) : Boolean(atual?.pixChave);
  if (dados.data.sinalAtivo && !temMercadoPago && !temChave) {
    return NextResponse.json(
      { erro: "Para cobrar sinal, conecte o Mercado Pago ou cadastre a sua chave Pix." },
      { status: 400 },
    );
  }

  const valores = {
    sinalAtivo: dados.data.sinalAtivo,
    sinalPercentual: dados.data.sinalPercentual,
    ...(credenciais ?? {}),
    ...(chave ?? {}),
  };
  await prisma.configuracaoPagamento.upsert({
    where: { barbeariaId },
    update: valores,
    create: { barbeariaId, ...valores },
  });

  return NextResponse.json({ ok: true });
}

// Desconecta o Mercado Pago: apaga o token (e os dados do botão). O sinal
// continua só se houver chave Pix cadastrada.
export async function DELETE() {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  const barbeariaId = sessao.barbeariaId!;

  const pendentes = await pixPendentesMercadoPago(barbeariaId);
  if (pendentes > 0) return respostaPixPendentes(pendentes, "desconectar");

  const config = await prisma.configuracaoPagamento.findUnique({ where: { barbeariaId }, select: { pixChave: true } });
  await prisma.configuracaoPagamento.updateMany({
    where: { barbeariaId },
    data: {
      mpAccessTokenCifrado: null,
      mpContaDescricao: null,
      mpRefreshTokenCifrado: null,
      mpTokenExpiraEm: null,
      mpUsuarioId: null,
      ...(config?.pixChave ? {} : { sinalAtivo: false }),
    },
  });
  return NextResponse.json({ ok: true });
}
