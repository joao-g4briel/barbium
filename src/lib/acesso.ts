// Prazo de uso da barbearia (teste grátis ou assinatura paga). Sem data:
// sem prazo. Usado no servidor e nas telas, por isso sem "server-only".

const DIA_MS = 24 * 60 * 60 * 1000;

export function acessoVencido(barbearia: { acessoAte: Date | null }, agora = new Date()): boolean {
  return barbearia.acessoAte !== null && barbearia.acessoAte.getTime() <= agora.getTime();
}

// Dias que faltam, arredondando pra cima (falta 1h → "1 dia"). null sem prazo.
export function diasRestantes(barbearia: { acessoAte: Date | null }, agora = new Date()): number | null {
  if (barbearia.acessoAte === null) return null;
  return Math.max(0, Math.ceil((barbearia.acessoAte.getTime() - agora.getTime()) / DIA_MS));
}
