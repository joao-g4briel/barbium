import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ehViolacaoDeUnicidade } from "@/lib/erros-banco";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

const editarClienteSchema = z.object({
  nome: z.string().min(2),
  telefone: z.string().min(8),
});

// O cliente pediu pra parar (ou voltar) a receber as mensagens automáticas.
// Qualquer pessoa da equipe registra: é um pedido do cliente, não uma edição
// de cadastro.
const preferenciaSchema = z.object({ aceitaMensagens: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const { id } = await params;

  const clienteExistente = await prisma.cliente.findUnique({ where: { id } });
  if (!clienteExistente || clienteExistente.barbeariaId !== sessao.barbeariaId || clienteExistente.removidoEm) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const corpo = await request.json().catch(() => null);

  const preferencia = preferenciaSchema.safeParse(corpo);
  if (preferencia.success) {
    await prisma.cliente.update({ where: { id }, data: { aceitaMensagens: preferencia.data.aceitaMensagens } });
    return NextResponse.json({ ok: true });
  }

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode editar clientes." },
      { status: 403 },
    );
  }

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

  let cliente;
  try {
    cliente = await prisma.cliente.update({
      where: { id },
      data: { nome: dados.data.nome, telefone: telefoneNormalizado },
    });
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) return NextResponse.json({ erro: "Já existe outro cliente com esse telefone." }, { status: 409 });
    throw erro;
  }

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

  // Atendimento que movimentou dinheiro (concluído, ou com sinal no caixa) é
  // histórico da barbearia: apagar mudaria o faturamento de meses fechados e
  // comissões já pagas. Esses ficam, e o cliente é anonimizado (nome e
  // telefone apagados). O resto (futuros, cancelados e faltas sem dinheiro)
  // é apagado. Sem nenhum atendimento desses, o cliente é apagado de vez.
  const resultado = await prisma.$transaction(async (tx) => {
    const comHistorico = await tx.agendamento.findMany({
      where: { clienteId: id, OR: [{ status: "CONCLUIDO" }, { caixaLancamentos: { some: {} } }] },
      select: { id: true },
    });
    await tx.agendamento.deleteMany({
      where: { clienteId: id, id: { notIn: comHistorico.map((a) => a.id) } },
    });

    if (comHistorico.length === 0) {
      await tx.cliente.delete({ where: { id } });
      return "excluido" as const;
    }

    await tx.cliente.update({
      where: { id },
      data: {
        nome: "Cliente removido",
        // Telefone é único por barbearia: um valor que nunca colide e deixa o
        // número livre pra um cadastro novo, se a pessoa voltar.
        telefone: `removido:${id}`,
        assinaturaTipo: null,
        assinaturaValor: null,
        assinaturaVencimento: null,
        aceitaMensagens: false,
        removidoEm: new Date(),
      },
    });
    return "anonimizado" as const;
  });

  return NextResponse.json({ ok: true, resultado });
}
