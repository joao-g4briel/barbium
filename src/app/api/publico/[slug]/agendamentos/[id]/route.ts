import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { liberarSinaisExpirados, sincronizarSinal } from "@/lib/sinal";

// Consultada pela tela do Pix enquanto o cliente paga. Devolve só o estado do
// agendamento — nada de dados do cliente.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;

  const barbearia = await prisma.barbearia.findUnique({ where: { slug }, select: { id: true } });
  if (!barbearia) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const buscar = () =>
    prisma.agendamento.findFirst({
      where: { id, barbeariaId: barbearia.id },
      select: { status: true, sinalStatus: true, sinalPagamentoId: true, barbeariaId: true },
    });

  const agendamento = await buscar();
  if (!agendamento) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  if (agendamento.status === "AGUARDANDO_PAGAMENTO") {
    // Confere no Mercado Pago antes de expirar, pra não liberar um horário
    // que acabou de ser pago enquanto o webhook ainda não chegou.
    await sincronizarSinal(agendamento).catch(() => {});
    await liberarSinaisExpirados(barbearia.id);
  }

  const atual = await buscar();
  return NextResponse.json({ status: atual?.status, sinalStatus: atual?.sinalStatus });
}
