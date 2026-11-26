import "server-only";
import { prisma } from "./prisma";
import { AUTOR_CLIENTE_AGENDAMENTO, AUTOR_SISTEMA_PIX_EXPIRADO, AUTOR_SISTEMA_PIX_PAGO, registrarHistorico, type Autor } from "./historico";
import { cifrar, decifrar } from "./segredos";
import { buscarPagamento, cancelarPagamento, type PagamentoMP } from "./mercadopago";
import { renovarToken } from "./mercadopago-oauth";
import { registrarSinalPago, restanteAReceber } from "./caixa-agendamento";
import { notificarAgendamento } from "./notificacoes";

// Tempo que o horário fica reservado esperando o Pix. 30 minutos é o mínimo
// que o Mercado Pago aceita como validade de um Pix.
export const SINAL_RESERVA_MINUTOS = 30;
export const SINAL_PERCENTUAL_MIN = 10;
export const SINAL_PERCENTUAL_MAX = 100;

export function calcularSinal(preco: number, percentual: number): number {
  const centavos = Math.round(preco * 100);
  return Math.round((centavos * percentual) / 100) / 100;
}

// O Pix exige e-mail do pagador, mas o cliente agenda só com nome e telefone.
// Endereço técnico por agendamento; não é usado pra contato.
export function emailPagadorSinal(agendamentoId: string): string {
  return `sinal.${agendamentoId}@barbium.com.br`;
}

// Como a barbearia recebe online: Mercado Pago (confirmação automática) ou a
// chave Pix dela (o dono confere e confirma). Com os dois, vale o Mercado Pago.
export type MetodoPix = "mercadopago" | "chave";

interface ConfigRecebimento {
  mpAccessTokenCifrado: string | null;
  mpTokenExpiraEm: Date | null;
  pixChave: string | null;
  pixTipoChave: string | null;
}

// Token conectado pelo botão vale 180 dias; colado à mão, não expira aqui.
function mercadoPagoUsavel(config: ConfigRecebimento, agora = new Date()): boolean {
  return Boolean(config.mpAccessTokenCifrado) && (!config.mpTokenExpiraEm || config.mpTokenExpiraEm > agora);
}

function metodoDe(config: ConfigRecebimento | null): MetodoPix | null {
  if (!config) return null;
  if (mercadoPagoUsavel(config)) return "mercadopago";
  if (config.pixChave && config.pixTipoChave) return "chave";
  return null;
}

const SELECAO_RECEBIMENTO = { mpAccessTokenCifrado: true, mpTokenExpiraEm: true, pixChave: true, pixTipoChave: true } as const;

// Para as telas: o que a barbearia consegue receber online.
export async function meiosDeRecebimento(barbeariaId: string): Promise<{ pix: MetodoPix | null; cartao: boolean }> {
  const config = await prisma.configuracaoPagamento.findUnique({ where: { barbeariaId }, select: SELECAO_RECEBIMENTO });
  const pix = metodoDe(config);
  // Cartão com renovação automática só existe pelo Mercado Pago.
  return { pix, cartao: pix === "mercadopago" };
}

// Só o que pode ir pra página pública: se cobra sinal, quanto e como.
export async function obterSinalPublico(barbeariaId: string): Promise<{ percentual: number; metodo: MetodoPix } | null> {
  const config = await prisma.configuracaoPagamento.findFirst({
    where: { barbeariaId, sinalAtivo: true },
    select: { sinalPercentual: true, ...SELECAO_RECEBIMENTO },
  });
  const metodo = metodoDe(config);
  return config && metodo ? { percentual: config.sinalPercentual, metodo } : null;
}

// Renova o token conectado pelo botão quando falta menos que isso. O cron
// diário renova com bem mais antecedência; isto é a rede de segurança.
const RENOVAR_NA_HORA_MS = 24 * 60 * 60 * 1000;

export async function obterTokenMercadoPago(barbeariaId: string): Promise<string | null> {
  const config = await prisma.configuracaoPagamento.findUnique({
    where: { barbeariaId },
    select: { mpAccessTokenCifrado: true, mpRefreshTokenCifrado: true, mpTokenExpiraEm: true },
  });
  if (!config?.mpAccessTokenCifrado) return null;
  // Token colado à mão: usa como está.
  if (!config.mpRefreshTokenCifrado || !config.mpTokenExpiraEm) return decifrar(config.mpAccessTokenCifrado);

  const agora = Date.now();
  if (config.mpTokenExpiraEm.getTime() - agora > RENOVAR_NA_HORA_MS) return decifrar(config.mpAccessTokenCifrado);
  const renovado = await renovarTokenMercadoPago(barbeariaId).catch((erro) => {
    console.error("Renovar token do Mercado Pago:", erro instanceof Error ? erro.message : erro);
    return null;
  });
  if (renovado) return renovado;
  return config.mpTokenExpiraEm.getTime() > agora ? decifrar(config.mpAccessTokenCifrado) : null;
}

// Troca o refresh token por um token novo e grava os dois. Só grava se
// ninguém renovou no meio-tempo: cada renovação invalida o refresh token
// anterior, então duas ao mesmo tempo não podem se sobrescrever.
export async function renovarTokenMercadoPago(barbeariaId: string): Promise<string | null> {
  const config = await prisma.configuracaoPagamento.findUnique({
    where: { barbeariaId },
    select: { mpRefreshTokenCifrado: true, mpTokenExpiraEm: true },
  });
  if (!config?.mpRefreshTokenCifrado) return null;
  const novo = await renovarToken(decifrar(config.mpRefreshTokenCifrado));
  const gravado = await prisma.configuracaoPagamento.updateMany({
    where: { barbeariaId, mpTokenExpiraEm: config.mpTokenExpiraEm },
    data: {
      mpAccessTokenCifrado: cifrar(novo.accessToken),
      mpRefreshTokenCifrado: cifrar(novo.refreshToken),
      mpTokenExpiraEm: novo.expiraEm,
    },
  });
  if (gravado.count > 0) return novo.accessToken;
  const atual = await prisma.configuracaoPagamento.findUnique({ where: { barbeariaId }, select: { mpAccessTokenCifrado: true } });
  return atual?.mpAccessTokenCifrado ? decifrar(atual.mpAccessTokenCifrado) : null;
}

// Pix não pago a tempo: o horário volta a ficar livre. sinalStatus continua
// PENDENTE pra um pagamento atrasado ainda ser reconhecido. Pix pela chave
// que o cliente já avisou ter pago não tem prazo (sinalExpiraEm vazio): fica
// reservado até o dono conferir.
export async function liberarSinaisExpirados(barbeariaId: string): Promise<void> {
  const agora = new Date();
  const vencidos = await prisma.agendamento.findMany({
    where: { barbeariaId, status: "AGUARDANDO_PAGAMENTO", sinalExpiraEm: { lt: agora } },
    select: { id: true },
  });
  if (vencidos.length === 0) return;
  await prisma.$transaction(async (tx) => {
    for (const { id } of vencidos) {
      // Só os que continuam esperando: o Pix pode ter sido pago neste meio-tempo.
      const r = await tx.agendamento.updateMany({
        where: { id, status: "AGUARDANDO_PAGAMENTO", sinalExpiraEm: { lt: agora } },
        data: { status: "CANCELADO" },
      });
      if (r.count > 0) {
        await registrarHistorico(tx, id, AUTOR_SISTEMA_PIX_EXPIRADO, {
          acao: "STATUS",
          statusDe: "AGUARDANDO_PAGAMENTO",
          statusPara: "CANCELADO",
        });
      }
    }
  });
}

export type ResultadoPagamento = "confirmado" | "pago" | "pago-sem-horario" | "ignorado";

// Aplica ao agendamento um pagamento lido da API do Mercado Pago (nunca do
// corpo do webhook). Idempotente: o mesmo pagamento aplicado duas vezes não
// muda nada na segunda.
export async function aplicarPagamento(barbeariaId: string, pagamento: PagamentoMP): Promise<ResultadoPagamento> {
  if (pagamento.status !== "approved" || !pagamento.external_reference) return "ignorado";
  const agendamentoId = pagamento.external_reference;

  const resultado = await aplicarPagamentoNoBanco(barbeariaId, agendamentoId, pagamento);
  // Só a aplicação que mudou o estado avisa: a mesma notificação do Mercado
  // Pago chegando de novo volta "ignorado" e não manda nada.
  if (resultado === "confirmado") notificarAgendamento("agendamento.confirmado", agendamentoId);
  if (resultado === "pago-sem-horario") notificarAgendamento("sinal.pago_sem_horario", agendamentoId);
  return resultado;
}

function aplicarPagamentoNoBanco(
  barbeariaId: string,
  agendamentoId: string,
  pagamento: PagamentoMP,
): Promise<ResultadoPagamento> {
  return prisma.$transaction(async (tx) => {
    const ag = await tx.agendamento.findUnique({
      where: { id: agendamentoId },
      include: { servico: { select: { nome: true, preco: true } } },
    });
    if (!ag || ag.barbeariaId !== barbeariaId || ag.sinalPagamentoId !== String(pagamento.id)) return "ignorado";
    if (ag.sinalStatus === "PAGO" || ag.sinalValor === null) return "ignorado";
    if (Math.round(pagamento.transaction_amount * 100) !== Math.round(Number(ag.sinalValor) * 100)) return "ignorado";

    const pago = { sinalStatus: "PAGO" as const, sinalPagoEm: new Date() };

    // O dinheiro do sinal entrou: vai pro caixa agora, seja qual for o status.
    await registrarSinalPago(tx, {
      id: ag.id,
      barbeariaId: ag.barbeariaId,
      sinalValor: ag.sinalValor,
      servicoNome: ag.servico.nome,
    });

    // Já concluído com o valor cheio (a barbearia confirmou sem sinal e o
    // cliente pagou o Pix depois): a entrada da conclusão vira só o restante,
    // pra não contar o sinal duas vezes.
    if (ag.status === "CONCLUIDO") {
      const restante = await restanteAReceber(tx, ag.id, Number(ag.servico.preco));
      if (restante > 0) {
        await tx.caixaLancamento.updateMany({
          where: { agendamentoId: ag.id, origem: "ATENDIMENTO" },
          data: { valor: restante },
        });
      } else {
        await tx.caixaLancamento.deleteMany({ where: { agendamentoId: ag.id, origem: "ATENDIMENTO" } });
      }
    }

    if (ag.status === "AGUARDANDO_PAGAMENTO") {
      await tx.agendamento.update({ where: { id: ag.id }, data: { ...pago, status: "CONFIRMADO" } });
      await registrarHistorico(tx, ag.id, AUTOR_SISTEMA_PIX_PAGO, {
        acao: "STATUS",
        statusDe: "AGUARDANDO_PAGAMENTO",
        statusPara: "CONFIRMADO",
      });
      return "confirmado";
    }

    // Pagou depois que o prazo venceu (cancelado pela expiração, não pela
    // barbearia): confirma se o horário ainda está livre e não passou.
    if (ag.status === "CANCELADO" && ag.sinalStatus === "PENDENTE") {
      const conflito = await tx.agendamento.findFirst({
        where: {
          barbeariaId,
          barbeiroId: ag.barbeiroId,
          id: { not: ag.id },
          status: { not: "CANCELADO" },
          inicio: { lt: ag.fim },
          fim: { gt: ag.inicio },
        },
      });
      if (!conflito && ag.inicio > new Date()) {
        await tx.agendamento.update({ where: { id: ag.id }, data: { ...pago, status: "CONFIRMADO" } });
        await registrarHistorico(tx, ag.id, AUTOR_SISTEMA_PIX_PAGO, {
          acao: "STATUS",
          statusDe: "CANCELADO",
          statusPara: "CONFIRMADO",
          detalhe: "Pix pago depois do prazo, com o horário ainda livre",
        });
        return "confirmado";
      }
      await tx.agendamento.update({ where: { id: ag.id }, data: pago });
      return "pago-sem-horario";
    }

    await tx.agendamento.update({ where: { id: ag.id }, data: pago });
    return "pago";
  });
}

// Consulta o Mercado Pago direto — rede de segurança pra quando o webhook
// atrasa ou não chega (ex.: ambiente local, sem URL pública).
export async function sincronizarSinal(ag: {
  barbeariaId: string;
  sinalPagamentoId: string | null;
  sinalStatus: string | null;
}): Promise<void> {
  if (!ag.sinalPagamentoId || ag.sinalStatus !== "PENDENTE") return;
  const token = await obterTokenMercadoPago(ag.barbeariaId);
  if (!token) return;
  const pagamento = await buscarPagamento(token, ag.sinalPagamentoId);
  await aplicarPagamento(ag.barbeariaId, pagamento);
}

// A barbearia decidiu pelo agendamento (cancelou ou confirmou sem sinal):
// o Pix pendente deixa de valer. Falha aqui não impede a ação no painel.
export async function cancelarPixPendente(ag: { barbeariaId: string; sinalPagamentoId: string | null }): Promise<void> {
  if (!ag.sinalPagamentoId) return;
  try {
    const token = await obterTokenMercadoPago(ag.barbeariaId);
    if (token) await cancelarPagamento(token, ag.sinalPagamentoId);
  } catch {
    // Pix já pago, expirado ou fora do ar: um pagamento que chegar depois é
    // registrado pelo webhook e aparece no painel pra a barbearia decidir.
  }
}

// --- Sinal pela chave Pix da barbearia --------------------------------------

export class ErroSinalChave extends Error {}

// O cliente tocou em "Já fiz o Pix": o horário deixa de ter prazo e fica
// reservado até o dono conferir. Avisa o dono uma vez.
export async function informarPixDoSinal(barbeariaId: string, agendamentoId: string): Promise<boolean> {
  const marcado = await prisma.$transaction(async (tx) => {
    const r = await tx.agendamento.updateMany({
      where: {
        id: agendamentoId,
        barbeariaId,
        status: "AGUARDANDO_PAGAMENTO",
        sinalViaChave: true,
        sinalStatus: "PENDENTE",
        sinalInformadoEm: null,
      },
      data: { sinalInformadoEm: new Date(), sinalExpiraEm: null },
    });
    if (r.count > 0) {
      await registrarHistorico(tx, agendamentoId, AUTOR_CLIENTE_AGENDAMENTO, {
        acao: "STATUS",
        detalhe: "Cliente avisou que fez o Pix do sinal",
      });
    }
    return r.count > 0;
  });
  if (marcado) notificarAgendamento("sinal.informado", agendamentoId);
  return marcado;
}

// O dono conferiu o Pix na conta dele: o sinal entra no caixa e o horário é
// confirmado. Vale antes ou depois de o cliente avisar.
export async function confirmarSinalPelaChave(barbeariaId: string, agendamentoId: string, autor: Autor): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const ag = await tx.agendamento.findUnique({
      where: { id: agendamentoId },
      include: { servico: { select: { nome: true } } },
    });
    if (!ag || ag.barbeariaId !== barbeariaId) throw new ErroSinalChave("Agendamento não encontrado.");
    if (!ag.sinalViaChave || ag.sinalValor === null) throw new ErroSinalChave("Este agendamento não tem sinal pela chave Pix.");
    if (ag.status !== "AGUARDANDO_PAGAMENTO" || ag.sinalStatus !== "PENDENTE") {
      throw new ErroSinalChave("Este sinal já foi resolvido. Atualize a agenda.");
    }
    await registrarSinalPago(tx, { id: ag.id, barbeariaId, sinalValor: ag.sinalValor, servicoNome: ag.servico.nome });
    await tx.agendamento.update({
      where: { id: ag.id },
      data: { status: "CONFIRMADO", sinalStatus: "PAGO", sinalPagoEm: new Date(), sinalExpiraEm: null },
    });
    await registrarHistorico(tx, ag.id, autor, {
      acao: "STATUS",
      statusDe: "AGUARDANDO_PAGAMENTO",
      statusPara: "CONFIRMADO",
      detalhe: "Sinal recebido pela chave Pix",
    });
  });
  notificarAgendamento("agendamento.confirmado", agendamentoId);
}

// Pix do Mercado Pago ainda aberto só é conferido com o token da conta que o
// gerou: trocar ou desconectar a conta antes de ele vencer deixaria um
// pagamento sem registro. (Os da chave Pix não dependem da conta.)
export async function pixPendentesMercadoPago(barbeariaId: string): Promise<number> {
  await liberarSinaisExpirados(barbeariaId);
  return prisma.agendamento.count({ where: { barbeariaId, status: "AGUARDANDO_PAGAMENTO", sinalViaChave: false } });
}
