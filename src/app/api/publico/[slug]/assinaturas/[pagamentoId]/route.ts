import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { informarPixDaAssinatura, sincronizarPagamentoAssinatura } from "@/lib/planos-corte";
import { codigoDaAssinatura } from "@/lib/link-cliente";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao } from "@/lib/limite-tentativas";

// Consultada pela tela do Pix do plano enquanto o cliente paga. Devolve só o
// estado do pagamento, a nova validade e, depois de pago, o código do link da
// assinatura (quem pagou é o cliente: o link vai pra ele guardar).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; pagamentoId: string }> },
) {
  const { slug, pagamentoId } = await params;
  const barbearia = await prisma.barbearia.findUnique({ where: { slug }, select: { id: true } });
  if (!barbearia) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const buscar = () =>
    prisma.pagamentoAssinatura.findFirst({
      where: { id: pagamentoId, barbeariaId: barbearia.id, online: true },
      select: {
        id: true,
        barbeariaId: true,
        mpPagamentoId: true,
        status: true,
        expiraEm: true,
        informadoEm: true,
        assinaturaId: true,
        assinatura: { select: { validaAte: true } },
      },
    });

  const pagamento = await buscar();
  if (!pagamento) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });
  if (pagamento.status === "PENDENTE") await sincronizarPagamentoAssinatura(pagamento).catch(() => {});

  const atual = await buscar();
  return NextResponse.json({
    status: atual?.status,
    informado: Boolean(atual?.informadoEm),
    validaAte: atual?.status === "PAGO" ? (atual.assinatura.validaAte?.toISOString() ?? null) : null,
    codigo: atual?.status === "PAGO" ? codigoDaAssinatura(atual.assinaturaId) : null,
  });
}

// Pix pela chave: o cliente avisa que pagou. Não confirma nada sozinho (quem
// confirma é o dono, conferindo no banco); só tira o prazo e avisa a barbearia.
const corpoSchema = z.object({ acao: z.literal("pix-informado") });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; pagamentoId: string }> },
) {
  const { slug, pagamentoId } = await params;
  if (!corpoSchema.safeParse(await request.json().catch(() => null)).success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const barbearia = await prisma.barbearia.findUnique({ where: { slug }, select: { id: true } });
  if (!barbearia) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const permitido = await dentroDosLimites([
    { chave: `pix-informado:ip:${ipDaRequisicao(request)}`, maximo: 20, janelaSegundos: 60 * 60 },
  ]);
  if (!permitido) return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });

  const pagamento = await prisma.pagamentoAssinatura.findFirst({
    where: { id: pagamentoId, barbeariaId: barbearia.id, viaChave: true },
    select: { id: true, barbeariaId: true, mpPagamentoId: true, status: true, expiraEm: true, informadoEm: true },
  });
  if (!pagamento) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });
  // Prazo vencido antes do aviso: o Pix não vale mais.
  if (pagamento.status === "PENDENTE" && !pagamento.informadoEm) await sincronizarPagamentoAssinatura(pagamento);
  const atual = await prisma.pagamentoAssinatura.findUnique({ where: { id: pagamento.id }, select: { status: true } });
  if (atual?.status === "EXPIRADO") {
    return NextResponse.json(
      { erro: "O prazo do Pix acabou. Se você já pagou, fale com a barbearia; se não, gere outro Pix." },
      { status: 409 },
    );
  }
  if (atual?.status === "PENDENTE") await informarPixDaAssinatura(barbearia.id, pagamento.id);
  return NextResponse.json({ ok: true });
}
