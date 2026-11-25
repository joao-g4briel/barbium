import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizarPagamentoAssinatura } from "@/lib/planos-corte";

// Consultada pela tela do Pix do plano enquanto o cliente paga. Devolve só o
// estado do pagamento e a nova validade.
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
        assinatura: { select: { validaAte: true } },
      },
    });

  const pagamento = await buscar();
  if (!pagamento) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });
  if (pagamento.status === "PENDENTE") await sincronizarPagamentoAssinatura(pagamento).catch(() => {});

  const atual = await buscar();
  return NextResponse.json({
    status: atual?.status,
    validaAte: atual?.status === "PAGO" ? (atual.assinatura.validaAte?.toISOString() ?? null) : null,
  });
}
