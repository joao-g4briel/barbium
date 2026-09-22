import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode excluir lançamentos." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const lancamento = await prisma.caixaLancamento.findUnique({ where: { id } });

  if (!lancamento || lancamento.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Lançamento não encontrado." }, { status: 404 });
  }

  if (lancamento.agendamentoId) {
    return NextResponse.json(
      {
        erro:
          "Esse lançamento veio de um agendamento concluído — pra removê-lo, mude o status do agendamento na Agenda.",
      },
      { status: 400 },
    );
  }

  await prisma.caixaLancamento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
