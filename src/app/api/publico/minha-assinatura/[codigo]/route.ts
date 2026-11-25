import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assinaturaDoCodigo } from "@/lib/link-cliente";
import { ErroCartao, cancelarRenovacaoCartao, criarPixDaAssinatura } from "@/lib/planos-corte";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao } from "@/lib/limite-tentativas";

// Ações do cliente na página da assinatura (/minha-assinatura/<código>). O
// código assinado é o que prova que é o cliente: chega a ele depois de pagar
// ou no WhatsApp dele, nunca só digitando um telefone.
// - cancelar-renovacao: para a cobrança mensal no cartão; o plano vale até o
//   fim do que já foi pago.
// - renovar-pix: gera o Pix de mais um mês.
const corpoSchema = z.object({ acao: z.enum(["cancelar-renovacao", "renovar-pix"]) });

export async function POST(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const id = assinaturaDoCodigo(codigo);
  if (!id) return NextResponse.json({ erro: "Link inválido." }, { status: 404 });

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });

  const assinatura = await prisma.assinaturaPlano.findUnique({
    where: { id },
    include: {
      plano: { select: { nome: true, valor: true, ativo: true } },
      barbearia: { select: { id: true, nome: true, ativo: true } },
    },
  });
  if (!assinatura || !assinatura.barbearia.ativo) return NextResponse.json({ erro: "Assinatura não encontrada." }, { status: 404 });
  if (assinatura.canceladaEm) {
    return NextResponse.json({ erro: "Esta assinatura foi encerrada pela barbearia." }, { status: 409 });
  }

  const permitido = await dentroDosLimites([
    { chave: `minha-assinatura:ip:${ipDaRequisicao(request)}`, maximo: 20, janelaSegundos: 60 * 60 },
  ]);
  if (!permitido) return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });

  if (dados.data.acao === "cancelar-renovacao") {
    if (!assinatura.mpPreapprovalId || assinatura.cartaoStatus === "cancelled") {
      return NextResponse.json({ erro: "Este plano não renova sozinho no cartão." }, { status: 409 });
    }
    try {
      await cancelarRenovacaoCartao(assinatura.id);
      return NextResponse.json({ ok: true });
    } catch (erro) {
      if (erro instanceof ErroCartao) return NextResponse.json({ erro: erro.message }, { status: 502 });
      console.error("Cancelar renovação:", erro instanceof Error ? erro.message : erro);
      return NextResponse.json({ erro: "Não foi possível cancelar agora. Tente de novo em instantes." }, { status: 502 });
    }
  }

  if (assinatura.cartaoStatus === "authorized") {
    return NextResponse.json({ erro: "Seu plano já renova sozinho no cartão." }, { status: 409 });
  }
  if (!assinatura.plano.ativo) {
    return NextResponse.json({ erro: "Este plano não está mais à venda. Fale com a barbearia." }, { status: 409 });
  }
  try {
    const pix = await criarPixDaAssinatura({
      barbearia: { id: assinatura.barbearia.id, nome: assinatura.barbearia.nome },
      assinaturaId: assinatura.id,
      plano: { nome: assinatura.plano.nome, valor: Number(assinatura.plano.valor) },
      origem: new URL(request.url).origin,
    });
    return NextResponse.json({ pagamento: pix });
  } catch (erro) {
    console.error("Pix da renovação:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "Não foi possível gerar o Pix agora. Tente de novo em instantes." }, { status: 502 });
  }
}
