import { describe, expect, it } from "vitest";
import { etapaDoAvisoDeTeste } from "./avisos-teste-regras";

const agora = new Date("2026-11-24T12:00:00Z");
const dias = (n: number) => new Date(agora.getTime() + n * 24 * 60 * 60 * 1000);
const base = { emTeste: true, avisoTesteAcabandoEm: null, avisoTesteFimEm: null };

describe("avisos de fim do teste", () => {
  it("avisa quando faltam até 3 dias, uma vez só", () => {
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: dias(5) }, agora)).toBeNull();
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: dias(3) }, agora)).toBe("acabando");
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: dias(0.5) }, agora)).toBe("acabando");
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: dias(2), avisoTesteAcabandoEm: dias(-1) }, agora)).toBeNull();
  });

  it("avisa que terminou até 3 dias depois, uma vez só", () => {
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: dias(-0.1) }, agora)).toBe("terminou");
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: dias(-3) }, agora)).toBe("terminou");
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: dias(-4) }, agora)).toBeNull();
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: dias(-1), avisoTesteFimEm: dias(-0.5) }, agora)).toBeNull();
  });

  it("quem já assinou ou não tem prazo não recebe aviso", () => {
    expect(etapaDoAvisoDeTeste({ ...base, emTeste: false, acessoAte: dias(1) }, agora)).toBeNull();
    expect(etapaDoAvisoDeTeste({ ...base, acessoAte: null }, agora)).toBeNull();
  });
});
