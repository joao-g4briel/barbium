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

// Valor cobrado de uma vez em cada período, em reais. Semestral: 10% a menos
// que 6 mensalidades. Anual: 10 mensalidades (2 meses grátis).
export const PRECOS: Record<Plano, Record<Periodo, number>> = {
  SOLO: { MENSAL: 60, SEMESTRAL: 324, ANUAL: 600 },
  BARBEARIA: { MENSAL: 90, SEMESTRAL: 486, ANUAL: 900 },
  REDE: { MENSAL: 140, SEMESTRAL: 756, ANUAL: 1400 },
};

export function precoPorMes(plano: Plano, periodo: Periodo): number {
  return Math.round((PRECOS[plano][periodo] / MESES_DO_PERIODO[periodo]) * 100) / 100;
}

// Quanto o período sai mais barato que pagar mês a mês, em % (0 no mensal).
export function economia(plano: Plano, periodo: Periodo): number {
  const cheio = PRECOS[plano].MENSAL * MESES_DO_PERIODO[periodo];
  return Math.round((1 - PRECOS[plano][periodo] / cheio) * 100);
}

// Meses que saem de graça no período, quando o preço é um número exato de
// mensalidades a menos (anual = 10 mensalidades → 2). 0 se não for o caso.
export function mesesGratis(plano: Plano, periodo: Periodo): number {
  const pagos = PRECOS[plano][periodo] / PRECOS[plano].MENSAL;
  return Number.isInteger(pagos) ? MESES_DO_PERIODO[periodo] - pagos : 0;
}

// O ganho do período em relação ao mensal, do jeito que aparece na tabela.
export function vantagemDoPeriodo(plano: Plano, periodo: Periodo): string | null {
  const gratis = mesesGratis(plano, periodo);
  if (gratis > 0) return gratis === 1 ? "1 mês grátis" : `${gratis} meses grátis`;
  const pct = economia(plano, periodo);
  return pct > 0 ? `${pct}% a menos que o mensal` : null;
}

export const DIAS_TESTE = 30;

// Adicional de WhatsApp (order bump no checkout da Cakto), por mês.
export const PRECO_ADICIONAL_WHATSAPP = 60;

// Links do checkout da Cakto, por plano e período. Enquanto um link estiver
// vazio, o botão "Assinar" leva ao WhatsApp de vendas com o plano escolhido.
export const CHECKOUT_CAKTO: Record<Plano, Record<Periodo, string | null>> = {
  SOLO: {
    MENSAL: "https://pay.cakto.com.br/asxogd4_1364596",
    SEMESTRAL: "https://pay.cakto.com.br/382rmg4",
    ANUAL: "https://pay.cakto.com.br/ocsv33o",
  },
  BARBEARIA: {
    MENSAL: "https://pay.cakto.com.br/vdgmx46",
    SEMESTRAL: "https://pay.cakto.com.br/33ydgax",
    ANUAL: "https://pay.cakto.com.br/dmjxr5j",
  },
  REDE: {
    MENSAL: "https://pay.cakto.com.br/9ngqs8q",
    SEMESTRAL: "https://pay.cakto.com.br/tctu2do",
    ANUAL: "https://pay.cakto.com.br/htdvqbo",
  },
};

export function linkAdicionalWhatsapp(): string {
  const texto = "Olá! Já assino o Barbium e quero contratar o adicional de WhatsApp.";
  return `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent(texto)}`;
}

export const WHATSAPP_VENDAS = "558131973711";

// barbeariaId vai no "sck" do checkout e volta no webhook da Cakto, que assim
// sabe qual barbearia pagou (lib/cakto.ts).
export function linkAssinar(plano: Plano, periodo: Periodo, nomePlano: string, barbeariaId?: string): string {
  const checkout = CHECKOUT_CAKTO[plano][periodo];
  if (checkout) return barbeariaId ? `${checkout}?sck=${encodeURIComponent(barbeariaId)}` : checkout;
  const texto = `Olá! Quero assinar o Barbium, plano ${nomePlano} ${ROTULO_PERIODO_ASSINATURA[periodo].toLowerCase()}.`;
  return `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent(texto)}`;
}
