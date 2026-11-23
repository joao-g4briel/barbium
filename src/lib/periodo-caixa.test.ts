import { afterEach, describe, expect, it, vi } from "vitest";
import { intervaloPeriodo, periodoValido } from "./periodo-caixa";

describe("períodos do caixa", () => {
  afterEach(() => vi.useRealTimers());

  it("hoje vai da 00:00 às 23:59:59.999 de Brasília", () => {
    vi.useFakeTimers({ now: new Date("2026-11-04T15:00:00Z") });
    expect(intervaloPeriodo("hoje")).toEqual({
      inicio: new Date("2026-11-04T03:00:00Z"),
      fim: new Date("2026-11-05T02:59:59.999Z"),
    });
  });

  it("às 22h de Brasília, hoje ainda é o mesmo dia (já é amanhã em UTC)", () => {
    vi.useFakeTimers({ now: new Date("2026-11-05T01:00:00Z") });
    expect(intervaloPeriodo("hoje").inicio).toEqual(new Date("2026-11-04T03:00:00Z"));
  });

  it("mês passado, em janeiro, volta pro dezembro do ano anterior", () => {
    vi.useFakeTimers({ now: new Date("2027-01-10T15:00:00Z") });
    expect(intervaloPeriodo("mes-passado")).toEqual({
      inicio: new Date("2026-12-01T03:00:00Z"),
      fim: new Date("2027-01-01T02:59:59.999Z"),
    });
  });

  it("este mês vai do dia 1 ao último dia do mês, não só até hoje", () => {
    vi.useFakeTimers({ now: new Date("2026-11-04T15:00:00Z") });
    expect(intervaloPeriodo("mes")).toEqual({
      inicio: new Date("2026-11-01T03:00:00Z"),
      fim: new Date("2026-12-01T02:59:59.999Z"), // 30/11 às 23:59:59 em Brasília
    });
    vi.setSystemTime(new Date("2026-12-15T15:00:00Z"));
    expect(intervaloPeriodo("mes").fim).toEqual(new Date("2027-01-01T02:59:59.999Z")); // 31/12
    vi.setSystemTime(new Date("2028-02-10T15:00:00Z"));
    expect(intervaloPeriodo("mes").fim).toEqual(new Date("2028-03-01T02:59:59.999Z")); // 29/02, ano bissexto
  });

  it("no último dia do mês às 22h de Brasília, ainda é o mesmo mês", () => {
    vi.useFakeTimers({ now: new Date("2026-12-01T01:00:00Z") }); // 30/11 às 22h
    expect(intervaloPeriodo("mes").inicio).toEqual(new Date("2026-11-01T03:00:00Z"));
  });

  it("últimos 7 dias inclui hoje e os 6 anteriores", () => {
    vi.useFakeTimers({ now: new Date("2026-11-04T15:00:00Z") });
    expect(intervaloPeriodo("semana").inicio).toEqual(new Date("2026-10-29T03:00:00Z"));
  });

  it("valor desconhecido na URL cai em mês", () => {
    expect(periodoValido("qualquer")).toBe("mes");
    expect(periodoValido(undefined)).toBe("mes");
  });
});
