import { describe, expect, it } from "vitest";
import {
  diaDaSemanaBrasil,
  fimDoDiaBrasil,
  horarioBrasil,
  inicioDaSemanaBrasil,
  inicioDoDiaBrasil,
  inicioDoMesBrasil,
} from "./fuso-brasil";

const utc = (iso: string) => new Date(iso);

describe("fuso de Brasília", () => {
  it("23h30 em Brasília ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC", () => {
    // 02:30 UTC do dia 5 = 23:30 do dia 4 em Brasília
    expect(inicioDoDiaBrasil(utc("2026-11-05T02:30:00Z"))).toEqual(utc("2026-11-04T00:00:00Z"));
  });

  it("meia-noite em Brasília (03:00 UTC) já é o dia novo", () => {
    expect(inicioDoDiaBrasil(utc("2026-11-05T03:00:00Z"))).toEqual(utc("2026-11-05T00:00:00Z"));
  });

  it("09:00 do expediente vira 12:00 UTC", () => {
    expect(horarioBrasil(utc("2026-11-04T00:00:00Z"), 9 * 60)).toEqual(utc("2026-11-04T12:00:00Z"));
  });

  it("dia da semana segue Brasília, não UTC", () => {
    // 08/11/2026 é domingo. 01:00 UTC de domingo ainda é sábado 22:00 em Brasília.
    expect(diaDaSemanaBrasil(utc("2026-11-08T01:00:00Z"))).toBe(6);
    expect(diaDaSemanaBrasil(utc("2026-11-08T12:00:00Z"))).toBe(0);
  });

  it("semana começa no domingo", () => {
    expect(inicioDaSemanaBrasil(utc("2026-11-04T15:00:00Z"))).toEqual(utc("2026-11-01T00:00:00Z"));
  });

  it("fim do dia é o último milissegundo antes do dia seguinte", () => {
    expect(fimDoDiaBrasil(utc("2026-11-04T15:00:00Z"))).toEqual(utc("2026-11-04T23:59:59.999Z"));
  });

  it("virada de mês respeita Brasília", () => {
    // 01:00 UTC de 1º/dez ainda é 30/nov em Brasília
    expect(inicioDoMesBrasil(utc("2026-12-01T01:00:00Z"))).toEqual(utc("2026-11-01T00:00:00Z"));
  });
});

describe("outros fusos do Brasil", () => {
  const MANAUS = "America/Manaus";
  const ACRE = "America/Rio_Branco";

  it("09:00 do expediente em Manaus vira 13:00 UTC; no Acre, 14:00 UTC", () => {
    expect(horarioBrasil(utc("2026-11-04T00:00:00Z"), 9 * 60, MANAUS)).toEqual(utc("2026-11-04T13:00:00Z"));
    expect(horarioBrasil(utc("2026-11-04T00:00:00Z"), 9 * 60, ACRE)).toEqual(utc("2026-11-04T14:00:00Z"));
  });

  it("o dia vira mais tarde em Manaus do que em Brasília", () => {
    // 03:30 UTC de quinta: em Brasília já é quinta 00:30; em Manaus ainda é quarta 23:30.
    expect(inicioDoDiaBrasil(utc("2026-11-05T03:30:00Z"))).toEqual(utc("2026-11-05T00:00:00Z"));
    expect(inicioDoDiaBrasil(utc("2026-11-05T03:30:00Z"), MANAUS)).toEqual(utc("2026-11-04T00:00:00Z"));
    expect(diaDaSemanaBrasil(utc("2026-11-05T03:30:00Z"), MANAUS)).toBe(3);
  });

  it("fuso desconhecido cai em Brasília", () => {
    expect(horarioBrasil(utc("2026-11-04T00:00:00Z"), 9 * 60, "Europe/Lisbon")).toEqual(utc("2026-11-04T12:00:00Z"));
  });
});
