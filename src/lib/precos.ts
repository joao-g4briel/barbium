import type { Plano } from "@prisma/client";

// Preços das assinaturas, mostrados na landing e na tela de assinatura do
// painel. Pagamento pela Cakto (checkout por plano e período).

export type Periodo = "MENSAL" | "SEMESTRAL" | "ANUAL";

export const PERIODOS: Periodo[] = ["MENSAL", "SEMESTRAL", "ANUAL"];

export const ROTULO_PERIODO_ASSINATURA: Record<Periodo, string> = {
  MENSAL: "Mensal",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

export const MESES_DO_PERIODO: Record<Periodo, number> = { MENSAL: 1, SEMESTRAL: 6, ANUAL: 12 };

// Valor cobrado de uma vez em cada período, em reais.
export const PRECOS: Record<Plano, Record<Periodo, number>> = {
  SOLO: { MENSAL: 60, SEMESTRAL: 252, ANUAL: 504 },
  BARBEARIA: { MENSAL: 90, SEMESTRAL: 282, ANUAL: 534 },
  REDE: { MENSAL: 140, SEMESTRAL: 332, ANUAL: 584 },
};

export function precoPorMes(plano: Plano, periodo: Periodo): number {
  return Math.round((PRECOS[plano][periodo] / MESES_DO_PERIODO[periodo]) * 100) / 100;
}

// Quanto o período sai mais barato que pagar mês a mês, em % (0 no mensal).
export function economia(plano: Plano, periodo: Periodo): number {
  const cheio = PRECOS[plano].MENSAL * MESES_DO_PERIODO[periodo];
  return Math.round((1 - PRECOS[plano][periodo] / cheio) * 100);
}

export const DIAS_TESTE = 7;

// Links do checkout da Cakto, por plano e período. Enquanto um link estiver
// vazio, o botão "Assinar" leva ao WhatsApp de vendas com o plano escolhido.
export const CHECKOUT_CAKTO: Record<Plano, Record<Periodo, string | null>> = {
  SOLO: { MENSAL: null, SEMESTRAL: null, ANUAL: null },
  BARBEARIA: { MENSAL: null, SEMESTRAL: null, ANUAL: null },
  REDE: { MENSAL: null, SEMESTRAL: null, ANUAL: null },
};

export const WHATSAPP_VENDAS = "5581989479982";

export function linkAssinar(plano: Plano, periodo: Periodo, nomePlano: string): string {
  const checkout = CHECKOUT_CAKTO[plano][periodo];
  if (checkout) return checkout;
  const texto = `Olá! Quero assinar o Barbium, plano ${nomePlano} ${ROTULO_PERIODO_ASSINATURA[periodo].toLowerCase()}.`;
  return `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent(texto)}`;
}
