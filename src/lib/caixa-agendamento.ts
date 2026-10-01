import "server-only";
import type { FormaPagamento, Prisma } from "@prisma/client";
import { calcularComissao } from "./forma-pagamento";

type Tx = Prisma.TransactionClient;

// Tudo que o caixa e a comissão fazem quando um agendamento muda de estado.
// Sempre dentro de uma transação, junto com a mudança do agendamento.

async function sinalNoCaixa(tx: Tx, agendamentoId: string): Promise<number> {
  const sinal = await tx.caixaLancamento.findUnique({
    where: { agendamentoId_origem: { agendamentoId, origem: "SINAL" } },
    select: { valor: true },
  });
  return sinal ? Number(sinal.valor) : 0;
}

// Quanto falta receber na hora do atendimento: o preço menos o sinal que já
// entrou no caixa (sinal devolvido não conta, porque já saiu do caixa).
export async function restanteAReceber(tx: Tx, agendamentoId: string, preco: number): Promise<number> {
  return Math.max(0, Math.round((preco - (await sinalNoCaixa(tx, agendamentoId))) * 100) / 100);
}

// Concluir: entra no caixa o restante, com a forma de pagamento, e a comissão
// do profissional fica guardada no agendamento.
export async function registrarConclusao(
  tx: Tx,
  agendamento: {
    id: string;
    barbeariaId: string;
    servico: { nome: string; preco: Prisma.Decimal | number; comissaoPercentual: Prisma.Decimal | number | null };
    barbeiro: { comissaoPercentual: Prisma.Decimal | number | null };
  },
  formaPagamento: FormaPagamento | null,
): Promise<void> {
  const preco = Number(agendamento.servico.preco);
  const restante = await restanteAReceber(tx, agendamento.id, preco);

  if (restante > 0) {
    await tx.caixaLancamento.upsert({
      where: { agendamentoId_origem: { agendamentoId: agendamento.id, origem: "ATENDIMENTO" } },
      update: { valor: restante, descricao: agendamento.servico.nome, formaPagamento },
      create: {
        tipo: "ENTRADA",
        valor: restante,
        descricao: agendamento.servico.nome,
        barbeariaId: agendamento.barbeariaId,
        agendamentoId: agendamento.id,
        origem: "ATENDIMENTO",
        formaPagamento,
      },
    });
  } else {
    // Sinal de 100%: nada a receber na hora.
    await tx.caixaLancamento.deleteMany({ where: { agendamentoId: agendamento.id, origem: "ATENDIMENTO" } });
  }

  const comissao = calcularComissao(
    preco,
    agendamento.barbeiro.comissaoPercentual === null ? null : Number(agendamento.barbeiro.comissaoPercentual),
    agendamento.servico.comissaoPercentual === null ? null : Number(agendamento.servico.comissaoPercentual),
  );
  await tx.agendamento.update({
    where: { id: agendamento.id },
    data: { comissaoPercentual: comissao?.percentual ?? null, comissaoValor: comissao?.valor ?? null },
  });
}

// Saiu de concluído (reaberto, cancelado, falta): o lançamento da conclusão e
// a comissão somem. O sinal, se pago, continua no caixa — foi recebido.
export async function desfazerConclusao(tx: Tx, agendamentoId: string): Promise<void> {
  await tx.caixaLancamento.deleteMany({ where: { agendamentoId, origem: "ATENDIMENTO" } });
  await tx.agendamento.update({
    where: { id: agendamentoId },
    data: { comissaoPercentual: null, comissaoValor: null },
  });
}

// Sinal aprovado no Mercado Pago: entra no caixa na hora, como Pix.
export async function registrarSinalPago(
  tx: Tx,
  agendamento: { id: string; barbeariaId: string; sinalValor: Prisma.Decimal | number; servicoNome: string },
): Promise<void> {
  await tx.caixaLancamento.upsert({
    where: { agendamentoId_origem: { agendamentoId: agendamento.id, origem: "SINAL" } },
    update: {},
    create: {
      tipo: "ENTRADA",
      valor: agendamento.sinalValor,
      descricao: `Sinal · ${agendamento.servicoNome}`,
      barbeariaId: agendamento.barbeariaId,
      agendamentoId: agendamento.id,
      origem: "SINAL",
      formaPagamento: "PIX",
    },
  });
}

// A barbearia devolveu o sinal pelo Mercado Pago: a entrada sai do caixa.
export async function registrarSinalDevolvido(tx: Tx, agendamentoId: string): Promise<void> {
  await tx.caixaLancamento.deleteMany({ where: { agendamentoId, origem: "SINAL" } });
  await tx.agendamento.update({ where: { id: agendamentoId }, data: { sinalDevolvidoEm: new Date() } });
}
