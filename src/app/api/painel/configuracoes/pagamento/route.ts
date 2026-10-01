import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { ChaveSegredosAusente, cifrar } from "@/lib/segredos";
import { verificarToken } from "@/lib/mercadopago";
import {
  SINAL_PERCENTUAL_MAX,
  SINAL_PERCENTUAL_MIN,
  SINAL_RESERVA_MINUTOS,
  liberarSinaisExpirados,
} from "@/lib/sinal";

const corpoSchema = z.object({
  sinalAtivo: z.boolean(),
  sinalPercentual: z.number().int().min(SINAL_PERCENTUAL_MIN).max(SINAL_PERCENTUAL_MAX),
  accessToken: z.string().trim().min(1).optional(),
});

// Pix pendente só é conferido com o token da conta que o gerou: trocar ou
// apagar o token antes de ele vencer deixaria um pagamento sem registro.
async function pixPendentes(barbeariaId: string): Promise<number> {
  await liberarSinaisExpirados(barbeariaId);
  return prisma.agendamento.count({ where: { barbeariaId, status: "AGUARDANDO_PAGAMENTO" } });
}

function respostaPixPendentes(quantidade: number, acao: string) {
  return NextResponse.json(
    {
      erro: `${quantidade === 1 ? "Há 1 Pix" : `Há ${quantidade} Pix`} aguardando pagamento. Para ${acao}, espere ${quantidade === 1 ? "ele ser pago ou vencer" : "eles serem pagos ou vencerem"} (no máximo ${SINAL_RESERVA_MINUTOS} minutos).`,
    },
    { status: 409 },
  );
}

async function exigirDono() {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao || sessao.role !== "DONO" || !sessao.barbeariaId) return null;
  return sessao;
}

export async function PUT(request: Request) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  const barbeariaId = sessao.barbeariaId!;

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json(
      { erro: `Informe um percentual entre ${SINAL_PERCENTUAL_MIN}% e ${SINAL_PERCENTUAL_MAX}%.` },
      { status: 400 },
    );
  }

  const atual = await prisma.configuracaoPagamento.findUnique({
    where: { barbeariaId },
    select: { mpAccessTokenCifrado: true },
  });

  let credenciais: { mpAccessTokenCifrado: string; mpContaDescricao: string } | null = null;
  if (dados.data.accessToken) {
    if (atual?.mpAccessTokenCifrado) {
      const pendentes = await pixPendentes(barbeariaId);
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
      credenciais = { mpAccessTokenCifrado: cifrar(dados.data.accessToken), mpContaDescricao: conta.descricao };
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

  if (dados.data.sinalAtivo && !credenciais && !atual?.mpAccessTokenCifrado) {
    return NextResponse.json(
      { erro: "Conecte a conta do Mercado Pago antes de ativar o sinal." },
      { status: 400 },
    );
  }

  const valores = {
    sinalAtivo: dados.data.sinalAtivo,
    sinalPercentual: dados.data.sinalPercentual,
    ...(credenciais ?? {}),
  };
  await prisma.configuracaoPagamento.upsert({
    where: { barbeariaId },
    update: valores,
    create: { barbeariaId, ...valores },
  });

  return NextResponse.json({ ok: true });
}

// Desconecta a conta: apaga o token e desliga a cobrança de sinal.
export async function DELETE() {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const pendentes = await pixPendentes(sessao.barbeariaId!);
  if (pendentes > 0) return respostaPixPendentes(pendentes, "desconectar");

  await prisma.configuracaoPagamento.updateMany({
    where: { barbeariaId: sessao.barbeariaId! },
    data: { sinalAtivo: false, mpAccessTokenCifrado: null, mpContaDescricao: null },
  });
  return NextResponse.json({ ok: true });
}
