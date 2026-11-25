import "server-only";
import type { FormaPagamento, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { buscarPagamento, criarPagamentoPix, type PagamentoMP } from "./mercadopago";
import { SINAL_RESERVA_MINUTOS, obterTokenMercadoPago } from "./sinal";
import { estenderValidade, mesDoPlano, situacaoAssinatura, type SituacaoAssinatura } from "./planos-corte-regras";

type Tx = Prisma.TransactionClient;
type Banco = Tx | typeof prisma;

// Referência do Pix de um mês de plano no Mercado Pago. O sinal usa o id do
// agendamento puro; o prefixo separa os dois no webhook.
export const PREFIXO_REFERENCIA_ASSINATURA = "assinatura:";

// Status que contam como uso do plano: cancelado devolve o uso.
const STATUS_QUE_NAO_CONTAM = ["CANCELADO", "AGUARDANDO_PAGAMENTO"] as const;

export interface PlanoPublico {
  id: string;
  nome: string;
  valor: number;
  usosPorMes: number | null;
  servicos: { id: string; nome: string }[];
}

// Planos ativos, com os serviços ativos que cobrem. É o que a página de
// agendamento mostra (nada aqui é segredo).
export async function obterPlanosPublicos(barbeariaId: string): Promise<PlanoPublico[]> {
  const planos = await prisma.planoCorte.findMany({
    where: { barbeariaId, ativo: true },
    orderBy: [{ valor: "asc" }, { nome: "asc" }],
    include: { servicos: { include: { servico: { select: { id: true, nome: true, ativo: true } } } } },
  });
  return planos
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      valor: Number(p.valor),
      usosPorMes: p.usosPorMes,
      servicos: p.servicos
        .map((s) => s.servico)
        .filter((s) => s.ativo)
        .map((s) => ({ id: s.id, nome: s.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    }))
    .filter((p) => p.servicos.length > 0);
}

// A assinatura não cancelada do cliente (no máximo uma), com o plano.
export function assinaturaDoCliente(db: Banco, clienteId: string) {
  return db.assinaturaPlano.findFirst({
    where: { clienteId, canceladaEm: null },
    orderBy: { criadoEm: "desc" },
    include: { plano: { include: { servicos: { select: { servicoId: true } } } } },
  });
}

export async function usosNoMes(db: Banco, assinaturaId: string, mes: { inicio: Date; fim: Date }): Promise<number> {
  return db.agendamento.count({
    where: {
      assinaturaId,
      status: { notIn: [...STATUS_QUE_NAO_CONTAM] },
      inicio: { gte: mes.inicio, lt: mes.fim },
    },
  });
}

// Segura a linha do cliente até o fim da transação: dois pedidos juntos do
// mesmo cliente (toque duplo) passam um de cada vez. É o que garante uma
// assinatura não cancelada por cliente e o limite de usos do mês.
export async function travarCliente(tx: Tx, clienteId: string): Promise<void> {
  await tx.$executeRaw`SELECT 1 FROM clientes WHERE id = ${clienteId} FOR UPDATE`;
}

// Mês pago (Pix aprovado ou pagamento no balcão): a assinatura ganha 30 dias
// e o valor entra no caixa. Idempotente: o mesmo pagamento aplicado de novo
// devolve null e não muda nada.
export async function registrarMesPago(tx: Tx, pagamentoId: string, agora: Date = new Date()): Promise<Date | null> {
  const marcado = await tx.pagamentoAssinatura.updateMany({
    where: { id: pagamentoId, status: { not: "PAGO" } },
    data: { status: "PAGO", pagoEm: agora },
  });
  if (marcado.count === 0) return null;

  const pagamento = await tx.pagamentoAssinatura.findUniqueOrThrow({
    where: { id: pagamentoId },
    select: { id: true, barbeariaId: true, assinaturaId: true, valor: true, formaPagamento: true },
  });
  // Dois meses pagos ao mesmo tempo somam os dois: um espera o outro aqui.
  await tx.$executeRaw`SELECT 1 FROM assinaturas_plano WHERE id = ${pagamento.assinaturaId} FOR UPDATE`;
  const assinatura = await tx.assinaturaPlano.findUniqueOrThrow({
    where: { id: pagamento.assinaturaId },
    include: { plano: { select: { nome: true } }, cliente: { select: { nome: true } } },
  });

  // Pix pago depois de a barbearia cancelar: o cliente pagou, então a
  // assinatura volta, se ele não tiver outra em andamento.
  let reativar = false;
  if (assinatura.canceladaEm) {
    const outra = await tx.assinaturaPlano.findFirst({
      where: { clienteId: assinatura.clienteId, canceladaEm: null, id: { not: assinatura.id } },
      select: { id: true },
    });
    reativar = !outra;
  }

  const validaAte = estenderValidade(assinatura.validaAte, agora);
  await tx.assinaturaPlano.update({
    where: { id: assinatura.id },
    data: { validaAte, ...(reativar ? { canceladaEm: null } : {}) },
  });
  await tx.caixaLancamento.create({
    data: {
      tipo: "ENTRADA",
      valor: pagamento.valor,
      descricao: `Plano ${assinatura.plano.nome} · ${assinatura.cliente.nome}`,
      barbeariaId: pagamento.barbeariaId,
      origem: "ASSINATURA",
      formaPagamento: pagamento.formaPagamento,
      pagamentoAssinaturaId: pagamento.id,
    },
  });
  return validaAte;
}

export interface PixDaAssinatura {
  pagamentoId: string;
  valor: number;
  expiraEm: string;
  qrCode: string;
  qrCodeBase64: string | null;
}

// Gera o Pix de um mês de plano na conta do Mercado Pago da barbearia.
export async function criarPixDaAssinatura(dados: {
  barbearia: { id: string; nome: string };
  assinaturaId: string;
  plano: { nome: string; valor: number };
  origem: string;
}): Promise<PixDaAssinatura> {
  const token = await obterTokenMercadoPago(dados.barbearia.id);
  if (!token) throw new Error("Sem token do Mercado Pago.");

  const expiraEm = new Date(Date.now() + SINAL_RESERVA_MINUTOS * 60 * 1000);
  const pagamento = await prisma.pagamentoAssinatura.create({
    data: {
      barbeariaId: dados.barbearia.id,
      assinaturaId: dados.assinaturaId,
      valor: dados.plano.valor,
      formaPagamento: "PIX",
      online: true,
      expiraEm,
    },
  });

  try {
    const mp = await criarPagamentoPix(token, {
      valor: dados.plano.valor,
      descricao: `Plano ${dados.plano.nome} · ${dados.barbearia.nome}`,
      referencia: `${PREFIXO_REFERENCIA_ASSINATURA}${pagamento.id}`,
      chaveIdempotencia: `assinatura-${pagamento.id}`,
      emailPagador: `plano.${pagamento.id}@barbium.com.br`,
      expiraEm,
      urlNotificacao: dados.origem.startsWith("https://")
        ? `${dados.origem}/api/mercadopago/webhook/${dados.barbearia.id}`
        : null,
    });
    const pix = mp.point_of_interaction?.transaction_data;
    if (!pix?.qr_code) throw new Error("Pix sem código.");
    await prisma.pagamentoAssinatura.update({ where: { id: pagamento.id }, data: { mpPagamentoId: String(mp.id) } });
    return {
      pagamentoId: pagamento.id,
      valor: dados.plano.valor,
      expiraEm: expiraEm.toISOString(),
      qrCode: pix.qr_code,
      qrCodeBase64: pix.qr_code_base64 ?? null,
    };
  } catch (erro) {
    await prisma.pagamentoAssinatura.update({ where: { id: pagamento.id }, data: { status: "EXPIRADO" } });
    throw erro;
  }
}

// Pagamento lido da API do Mercado Pago (nunca do corpo do webhook).
export async function aplicarPagamentoAssinatura(
  barbeariaId: string,
  mp: PagamentoMP,
): Promise<"pago" | "ignorado"> {
  const referencia = mp.external_reference ?? "";
  if (mp.status !== "approved" || !referencia.startsWith(PREFIXO_REFERENCIA_ASSINATURA)) return "ignorado";
  const pagamentoId = referencia.slice(PREFIXO_REFERENCIA_ASSINATURA.length);

  return prisma.$transaction(async (tx) => {
    const pagamento = await tx.pagamentoAssinatura.findUnique({ where: { id: pagamentoId } });
    if (!pagamento || pagamento.barbeariaId !== barbeariaId || pagamento.mpPagamentoId !== String(mp.id)) {
      return "ignorado";
    }
    if (Math.round(mp.transaction_amount * 100) !== Math.round(Number(pagamento.valor) * 100)) return "ignorado";
    return (await registrarMesPago(tx, pagamento.id)) ? "pago" : "ignorado";
  });
}

// Rede de segurança pra quando o webhook atrasa (ou nem chega, em ambiente
// local): consulta o Mercado Pago e, passado o prazo, dá o Pix por expirado.
export async function sincronizarPagamentoAssinatura(pagamento: {
  id: string;
  barbeariaId: string;
  mpPagamentoId: string | null;
  status: string;
  expiraEm: Date | null;
}): Promise<void> {
  if (pagamento.status !== "PENDENTE") return;
  if (pagamento.mpPagamentoId) {
    const token = await obterTokenMercadoPago(pagamento.barbeariaId);
    if (token) {
      const mp = await buscarPagamento(token, pagamento.mpPagamentoId);
      if ((await aplicarPagamentoAssinatura(pagamento.barbeariaId, mp)) === "pago") return;
    }
  }
  if (pagamento.expiraEm && pagamento.expiraEm < new Date()) {
    await prisma.pagamentoAssinatura.updateMany({
      where: { id: pagamento.id, status: "PENDENTE" },
      data: { status: "EXPIRADO" },
    });
  }
}

export interface SituacaoDoAssinante {
  situacao: SituacaoAssinatura | "NENHUMA";
  plano?: { id: string; nome: string; valor: number; usosPorMes: number | null; servicoIds: string[]; ativo: boolean };
  validaAte?: string | null;
  // Quantos atendimentos ainda cabem no mês atual do plano (vazio: ilimitado).
  usosRestantes?: number | null;
}

// O que a página de agendamento pode saber de quem diz ser assinante: só o
// plano e a validade. Nada de nome ou outros dados do cliente.
export async function situacaoPorTelefone(barbeariaId: string, telefone: string): Promise<SituacaoDoAssinante> {
  const cliente = await prisma.cliente.findUnique({
    where: { barbeariaId_telefone: { barbeariaId, telefone } },
    select: { id: true, removidoEm: true },
  });
  if (!cliente || cliente.removidoEm) return { situacao: "NENHUMA" };
  const assinatura = await assinaturaDoCliente(prisma, cliente.id);
  if (!assinatura) return { situacao: "NENHUMA" };

  const agora = new Date();
  const situacao = situacaoAssinatura(assinatura, agora);
  let usosRestantes: number | null = null;
  if (situacao === "ATIVA" && assinatura.validaAte && assinatura.plano.usosPorMes !== null) {
    const mes = mesDoPlano(assinatura.validaAte, agora);
    const usados = mes ? await usosNoMes(prisma, assinatura.id, mes) : 0;
    usosRestantes = Math.max(0, assinatura.plano.usosPorMes - usados);
  }
  return {
    situacao,
    plano: {
      id: assinatura.plano.id,
      nome: assinatura.plano.nome,
      valor: Number(assinatura.plano.valor),
      usosPorMes: assinatura.plano.usosPorMes,
      servicoIds: assinatura.plano.servicos.map((s) => s.servicoId),
      ativo: assinatura.plano.ativo,
    },
    validaAte: assinatura.validaAte?.toISOString() ?? null,
    usosRestantes,
  };
}

export type ResultadoPreparo =
  | { ok: true; assinaturaId: string }
  | { ok: false; planoAtual: string; validaAte: Date };

// Antes de cobrar um mês: devolve a assinatura que vai receber o pagamento.
// Mesmo plano: renova a atual. Outro plano: só troca se a atual não estiver
// valendo (com ela ativa, quem decide a troca é a barbearia, cancelando antes).
export async function prepararAssinatura(
  tx: Tx,
  dados: { barbeariaId: string; clienteId: string; planoId: string },
): Promise<ResultadoPreparo> {
  await travarCliente(tx, dados.clienteId);
  const atual = await assinaturaDoCliente(tx, dados.clienteId);
  if (atual) {
    if (atual.planoId === dados.planoId) return { ok: true, assinaturaId: atual.id };
    if (situacaoAssinatura(atual) === "ATIVA" && atual.validaAte) {
      return { ok: false, planoAtual: atual.plano.nome, validaAte: atual.validaAte };
    }
    await tx.assinaturaPlano.update({ where: { id: atual.id }, data: { planoId: dados.planoId } });
    return { ok: true, assinaturaId: atual.id };
  }
  const criada = await tx.assinaturaPlano.create({
    data: { barbeariaId: dados.barbeariaId, clienteId: dados.clienteId, planoId: dados.planoId },
    select: { id: true },
  });
  return { ok: true, assinaturaId: criada.id };
}

// Pagamento no balcão registrado pelo dono: já entra como pago.
export async function registrarPagamentoNoBalcao(
  tx: Tx,
  dados: { barbeariaId: string; assinaturaId: string; valor: number; formaPagamento: FormaPagamento },
): Promise<Date | null> {
  const pagamento = await tx.pagamentoAssinatura.create({
    data: {
      barbeariaId: dados.barbeariaId,
      assinaturaId: dados.assinaturaId,
      valor: dados.valor,
      formaPagamento: dados.formaPagamento,
      online: false,
    },
  });
  return registrarMesPago(tx, pagamento.id);
}
