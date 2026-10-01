import type { FormaPagamento, OrigemLancamento } from "@prisma/client";

export const ROTULO_ORIGEM: Record<OrigemLancamento, string> = {
  MANUAL: "Lançamento manual",
  ATENDIMENTO: "Atendimento concluído",
  SINAL: "Sinal do agendamento",
};

export const FORMAS_PAGAMENTO: FormaPagamento[] = ["PIX", "DINHEIRO", "DEBITO", "CREDITO"];

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
  CREDITO: "Crédito",
};

// Regra da barbearia: vale o percentual do profissional; sem ele, o do
// serviço; sem nenhum, não há comissão. A base é sempre o valor cheio do
// serviço (o sinal é parte do pagamento do mesmo serviço).
export function calcularComissao(
  precoServico: number,
  percentualProfissional: number | null,
  percentualServico: number | null,
): { percentual: number; valor: number } | null {
  const percentual = percentualProfissional ?? percentualServico;
  if (percentual === null) return null;
  const centavos = Math.round(precoServico * 100);
  return { percentual, valor: Math.round((centavos * percentual) / 100) / 100 };
}
