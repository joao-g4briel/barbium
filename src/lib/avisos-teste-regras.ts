// Quando sai cada aviso de fim do teste grátis (sem acesso ao banco, para testar).

export type EtapaAvisoTeste = "acabando" | "terminou";

const DIA_MS = 24 * 60 * 60 * 1000;
// "Acabando": faltam até 3 dias. "Terminou": venceu há até 3 dias (depois
// disso não manda mais, pra não avisar uma barbearia que já desistiu).
export const JANELA_ACABANDO_MS = 3 * DIA_MS;
export const JANELA_FIM_MS = 3 * DIA_MS;

export function etapaDoAvisoDeTeste(
  b: { emTeste: boolean; acessoAte: Date | null; avisoTesteAcabandoEm: Date | null; avisoTesteFimEm: Date | null },
  agora = new Date(),
): EtapaAvisoTeste | null {
  if (!b.emTeste || !b.acessoAte) return null;
  const falta = b.acessoAte.getTime() - agora.getTime();
  if (falta <= 0) {
    return -falta <= JANELA_FIM_MS && !b.avisoTesteFimEm ? "terminou" : null;
  }
  return falta <= JANELA_ACABANDO_MS && !b.avisoTesteAcabandoEm ? "acabando" : null;
}
