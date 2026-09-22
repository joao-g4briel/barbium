import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

const corpoSchema = z.object({
  status: z.enum(["CONFIRMADO", "CONCLUIDO", "CANCELADO", "FALTA"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  const corpo = await request.json().catch(() => null);
  const dados = corpoSchema.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { servico: true },
  });

  if (!agendamento || agendamento.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Agendamento não encontrado." }, { status: 404 });
  }

  // Barbeiro só mexe nos próprios agendamentos — dono mexe em qualquer um.
  if (sessao.role === "BARBEIRO" && agendamento.barbeiroId !== sessao.sub) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }

  const atualizado = await prisma.agendamento.update({
    where: { id },
    data: { status: dados.data.status },
  });

  if (dados.data.status === "CONCLUIDO") {
    // Lança automaticamente no caixa — idempotente: se já existir um
    // lançamento pra esse agendamento, não duplica.
    await prisma.caixaLancamento.upsert({
      where: { agendamentoId: id },
      update: {},
      create: {
        tipo: "ENTRADA",
        valor: agendamento.servico.preco,
        descricao: agendamento.servico.nome,
        barbeariaId: agendamento.barbeariaId,
        agendamentoId: id,
      },
    });
  } else {
    // Se voltou de CONCLUIDO pra outro status (correção de erro), desfaz
    // o lançamento de caixa que tinha sido criado.
    await prisma.caixaLancamento.deleteMany({ where: { agendamentoId: id } });
  }

  return NextResponse.json({ agendamento: atualizado });
}
