import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

const editarClienteSchema = z.object({
  nome: z.string().min(2),
  telefone: z.string().min(8),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode editar clientes." },
      { status: 403 },
    );
  }

  const { id } = await params;

  const clienteExistente = await prisma.cliente.findUnique({ where: { id } });
  if (!clienteExistente || clienteExistente.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const corpo = await request.json().catch(() => null);
  const dados = editarClienteSchema.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const telefoneNormalizado = dados.data.telefone.replace(/\D/g, "");
  if (telefoneNormalizado.length < 8) {
    return NextResponse.json({ erro: "Informe um telefone válido." }, { status: 400 });
  }

  if (telefoneNormalizado !== clienteExistente.telefone) {
    const conflito = await prisma.cliente.findUnique({
      where: {
        barbeariaId_telefone: { barbeariaId: sessao.barbeariaId!, telefone: telefoneNormalizado },
      },
    });
    if (conflito) {
      return NextResponse.json(
        { erro: "Já existe outro cliente com esse telefone." },
        { status: 409 },
      );
    }
  }

  const cliente = await prisma.cliente.update({
    where: { id },
    data: { nome: dados.data.nome, telefone: telefoneNormalizado },
  });

  return NextResponse.json({ cliente });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode excluir clientes." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente || cliente.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  // Apaga em cascata: primeiro os lançamentos de caixa ligados aos
  // agendamentos desse cliente, depois os agendamentos, depois o cliente.
  // É uma exclusão de verdade — o confirm() do botão já avisa isso antes
  // de chegar aqui.
  await prisma.$transaction(async (tx) => {
    const agendamentosDoCliente = await tx.agendamento.findMany({
      where: { clienteId: id },
      select: { id: true },
    });
    const agendamentoIds = agendamentosDoCliente.map((a) => a.id);

    if (agendamentoIds.length > 0) {
      await tx.caixaLancamento.deleteMany({ where: { agendamentoId: { in: agendamentoIds } } });
      await tx.agendamento.deleteMany({ where: { clienteId: id } });
    }

    await tx.cliente.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
