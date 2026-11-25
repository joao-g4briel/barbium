import "server-only";

// Cliente mínimo da API do Mercado Pago — só o que o sinal via Pix usa.
// MERCADOPAGO_API_URL existe só pra apontar pra um servidor falso em teste.
const API = process.env.MERCADOPAGO_API_URL ?? "https://api.mercadopago.com";

export class ErroMercadoPago extends Error {
  constructor(
    mensagem: string,
    public readonly status: number,
  ) {
    super(mensagem);
  }
}

async function chamar<T>(token: string, caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ErroMercadoPago(corpo?.message ?? `Mercado Pago respondeu ${resposta.status}.`, resposta.status);
  }
  return corpo as T;
}

export interface PagamentoMP {
  id: number;
  status: string; // pending | approved | cancelled | rejected | refunded | ...
  transaction_amount: number;
  external_reference: string | null;
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
  };
}

export async function verificarToken(token: string): Promise<{ id: number; descricao: string }> {
  const usuario = await chamar<{ id: number; nickname?: string; email?: string }>(token, "/users/me");
  return { id: usuario.id, descricao: usuario.email ?? usuario.nickname ?? `Conta ${usuario.id}` };
}

export async function criarPagamentoPix(
  token: string,
  dados: {
    valor: number;
    descricao: string;
    referencia: string;
    // Sem ela, vale a do sinal (sinal-<id do agendamento>).
    chaveIdempotencia?: string;
    emailPagador: string;
    expiraEm: Date;
    urlNotificacao: string | null;
  },
): Promise<PagamentoMP> {
  return chamar<PagamentoMP>(token, "/v1/payments", {
    method: "POST",
    // A referência (id do agendamento) é estável: repetir a chamada não cria
    // um segundo Pix pro mesmo agendamento.
    headers: { "X-Idempotency-Key": dados.chaveIdempotencia ?? `sinal-${dados.referencia}` },
    body: JSON.stringify({
      transaction_amount: dados.valor,
      description: dados.descricao,
      payment_method_id: "pix",
      external_reference: dados.referencia,
      date_of_expiration: dados.expiraEm.toISOString(),
      payer: { email: dados.emailPagador },
      ...(dados.urlNotificacao ? { notification_url: dados.urlNotificacao } : {}),
    }),
  });
}

export async function buscarPagamento(token: string, id: string): Promise<PagamentoMP> {
  return chamar<PagamentoMP>(token, `/v1/payments/${encodeURIComponent(id)}`);
}

export async function cancelarPagamento(token: string, id: string): Promise<void> {
  await chamar(token, `/v1/payments/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

// --- Assinatura no cartão (Mercado Pago cobra todo mês sozinho) -----------

export interface AssinaturaCartaoMP {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  init_point?: string;
  external_reference?: string | null;
  next_payment_date?: string | null;
}

export interface CobrancaCartaoMP {
  id: number;
  preapproval_id: string;
  transaction_amount: number | string;
  debit_date?: string | null;
  date_created?: string | null;
  status?: string;
  payment?: { id?: number | null; status?: string | null } | null;
}

// Cria a assinatura "pendente": o cliente põe o cartão na página do Mercado
// Pago (init_point) e a primeira cobrança sai na hora.
export async function criarAssinaturaCartao(
  token: string,
  dados: { valor: number; descricao: string; referencia: string; emailPagador: string; urlRetorno: string },
): Promise<AssinaturaCartaoMP> {
  return chamar<AssinaturaCartaoMP>(token, "/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: dados.descricao,
      external_reference: dados.referencia,
      payer_email: dados.emailPagador,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: dados.valor,
        currency_id: "BRL",
      },
      back_url: dados.urlRetorno,
      status: "pending",
    }),
  });
}

export async function buscarAssinaturaCartao(token: string, id: string): Promise<AssinaturaCartaoMP> {
  return chamar<AssinaturaCartaoMP>(token, `/preapproval/${encodeURIComponent(id)}`);
}

export async function cancelarAssinaturaCartao(token: string, id: string): Promise<AssinaturaCartaoMP> {
  return chamar<AssinaturaCartaoMP>(token, `/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

// Cobranças mensais de uma assinatura (as mais recentes bastam: quem chama
// só procura as aprovadas que ainda não foram registradas).
export async function listarCobrancasCartao(token: string, preapprovalId: string): Promise<CobrancaCartaoMP[]> {
  const parametros = new URLSearchParams({ preapproval_id: preapprovalId, limit: "50" });
  const resposta = await chamar<{ results?: CobrancaCartaoMP[] }>(token, `/authorized_payments/search?${parametros}`);
  return resposta.results ?? [];
}

export async function buscarCobrancaCartao(token: string, id: string): Promise<CobrancaCartaoMP> {
  return chamar<CobrancaCartaoMP>(token, `/authorized_payments/${encodeURIComponent(id)}`);
}
