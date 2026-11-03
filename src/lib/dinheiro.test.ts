import { describe, expect, it } from "vitest";
import { calcularComissao } from "./forma-pagamento";
import { calcularSinal } from "./sinal";
import { cabeMaisUm } from "./planos";

describe("comissão", () => {
  it("vale o percentual do profissional antes do do serviço", () => {
    expect(calcularComissao(50, 40, 30)).toEqual({ percentual: 40, valor: 20 });
  });

  it("sem percentual do profissional, usa o do serviço", () => {
    expect(calcularComissao(50, null, 30)).toEqual({ percentual: 30, valor: 15 });
  });

  it("sem nenhum percentual, não há comissão", () => {
    expect(calcularComissao(50, null, null)).toBeNull();
  });

  it("percentual zero do profissional vale (não cai pro do serviço)", () => {
    expect(calcularComissao(50, 0, 30)).toEqual({ percentual: 0, valor: 0 });
  });

  it("arredonda pro centavo sem erro de ponto flutuante", () => {
    expect(calcularComissao(33.33, 33.33, null)?.valor).toBe(11.11);
    expect(calcularComissao(0.1 + 0.2, 50, null)?.valor).toBe(0.15);
  });
});

describe("sinal", () => {
  it("calcula o percentual do preço", () => {
    expect(calcularSinal(45, 50)).toBe(22.5);
    expect(calcularSinal(45, 100)).toBe(45);
  });

  it("arredonda pro centavo", () => {
    expect(calcularSinal(35.9, 30)).toBe(10.77);
  });
});

describe("limite de profissionais por plano", () => {
  it("Solo comporta só o dono", () => {
    expect(cabeMaisUm("SOLO", 0)).toBe(true);
    expect(cabeMaisUm("SOLO", 1)).toBe(false);
  });

  it("Barbearia comporta até 5", () => {
    expect(cabeMaisUm("BARBEARIA", 4)).toBe(true);
    expect(cabeMaisUm("BARBEARIA", 5)).toBe(false);
  });

  it("Rede não tem limite", () => {
    expect(cabeMaisUm("REDE", 500)).toBe(true);
  });
});
