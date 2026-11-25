import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizarPagamentoAssinatura } from "@/lib/planos-corte";
import { codigoDaAssinatura } from "@/lib/link-cliente";

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
    validaAte: atual?.status === "PAGO" ? (atual.assinatura.validaAte?.toISOString() ?? null) : null,
    codigo: atual?.status === "PAGO" ? codigoDaAssinatura(atual.assinaturaId) : null,
  });
}
