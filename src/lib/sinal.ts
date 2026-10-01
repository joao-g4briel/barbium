import "server-only";
import { prisma } from "./prisma";
import { decifrar } from "./segredos";
import { buscarPagamento, cancelarPagamento, type PagamentoMP } from "./mercadopago";
import { registrarSinalPago, restanteAReceber } from "./caixa-agendamento";

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

// Só o que pode ir pra página pública: se cobra sinal e quanto. Nunca o token.
export async function obterSinalPublico(barbeariaId: string): Promise<{ percentual: number } | null> {
  const config = await prisma.configuracaoPagamento.findFirst({
    where: { barbeariaId, sinalAtivo: true, mpAccessTokenCifrado: { not: null } },
    select: { sinalPercentual: true },
  });
  return config ? { percentual: config.sinalPercentual } : null;
}

export async function obterTokenMercadoPago(barbeariaId: string): Promise<string | null> {
  const config = await prisma.configuracaoPagamento.findUnique({
    where: { barbeariaId },
    select: { mpAccessTokenCifrado: true },
  });
  return config?.mpAccessTokenCifrado ? decifrar(config.mpAccessTokenCifrado) : null;
}

// Pix não pago a tempo: o horário volta a ficar livre. sinalStatus continua
// PENDENTE pra um pagamento atrasado ainda ser reconhecido.
export async function liberarSinaisExpirados(barbeariaId: string): Promise<void> {
  await prisma.agendamento.updateMany({
    where: { barbeariaId, status: "AGUARDANDO_PAGAMENTO", sinalExpiraEm: { lt: new Date() } },
    data: { status: "CANCELADO" },
  });
}

export type ResultadoPagamento = "confirmado" | "pago" | "pago-sem-horario" | "ignorado";

// Aplica ao agendamento um pagamento lido da API do Mercado Pago (nunca do
// corpo do webhook). Idempotente: o mesmo pagamento aplicado duas vezes não
// muda nada na segunda.
export async function aplicarPagamento(barbeariaId: string, pagamento: PagamentoMP): Promise<ResultadoPagamento> {
  if (pagamento.status !== "approved" || !pagamento.external_reference) return "ignorado";
  const agendamentoId = pagamento.external_reference;

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
