import { describe, expect, it } from "vitest";
import { montarAvisoRenovacao } from "./avisos-plano-texto";

const base = {
  cliente: "Lucas Andrade",
  plano: "Plano Corte",
  barbearia: "Barbearia RIO",
  vence: "Sexta-feira, 27/11",
  link: "https://barbium.example/minha-assinatura/abc.def",
  cartaoCancelado: false,
};

describe("montarAvisoRenovacao", () => {
  it("usa o primeiro nome, a data e o link", () => {
    const texto = montarAvisoRenovacao(base);
    expect(texto).toContain("Olá, Lucas!");
    expect(texto).toContain("Seu plano *Plano Corte* na *Barbearia RIO* vence sexta-feira, 27/11.");
    expect(texto).toContain("Renove aqui: https://barbium.example/minha-assinatura/abc.def");
  });
  it("explica quando a renovação do cartão foi cancelada", () => {
    expect(montarAvisoRenovacao({ ...base, cartaoCancelado: true })).toContain("não renova sozinho");
  });
  it("sem link, não deixa linha vazia de link", () => {
    expect(montarAvisoRenovacao({ ...base, link: null })).not.toContain("Renove aqui");
  });
});
