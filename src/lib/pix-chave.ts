import "server-only";
import QRCode from "qrcode";
import type { TipoChavePix } from "@prisma/client";
import { prisma } from "./prisma";
import { montarBrCode } from "./pix-brcode";

// Pix pela chave da barbearia: gera o QR e o copia e cola com o valor certo.
// Sem confirmação automática; o dono confere no banco e confirma no Barbium.

export interface ChavePix {
  tipo: TipoChavePix;
  chave: string;
  cidade: string;
}

export async function obterChavePix(barbeariaId: string): Promise<ChavePix | null> {
  const config = await prisma.configuracaoPagamento.findUnique({
    where: { barbeariaId },
    select: { pixTipoChave: true, pixChave: true, pixCidade: true },
  });
  if (!config?.pixTipoChave || !config.pixChave) return null;
  return { tipo: config.pixTipoChave, chave: config.pixChave, cidade: config.pixCidade ?? "" };
}

export async function pixPelaChave(dados: {
  chave: ChavePix;
  barbeariaNome: string;
  valor: number;
  // Id da cobrança (agendamento ou mês do plano): aparece no extrato do dono.
  txid: string;
  descricao: string;
}): Promise<{ qrCode: string; qrCodeBase64: string }> {
  const qrCode = montarBrCode({
    chave: dados.chave.chave,
    nome: dados.barbeariaNome,
    cidade: dados.chave.cidade,
    valor: dados.valor,
    txid: dados.txid,
    descricao: dados.descricao,
  });
  const imagem = await QRCode.toDataURL(qrCode, { errorCorrectionLevel: "M", margin: 1, width: 360 });
  return { qrCode, qrCodeBase64: imagem.replace(/^data:image\/png;base64,/, "") };
}
