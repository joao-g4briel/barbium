import { describe, expect, it } from "vitest";
import {
  antecedenciaValida,
  diaDentroDoPeriodo,
  diasAFrenteValido,
  motivoForaDasRegras,
  primeiroHorarioAceito,
} from "./pagina-agendamento";

const hoje = new Date("2026-11-25T00:00:00Z"); // dia de calendário
const dia = (n: number) => new Date(hoje.getTime() + n * 86400000);
const agora = new Date("2026-11-25T13:00:00Z");
const regras = { antecedenciaMinimaMin: 120, diasAFrente: 7 };

describe("regras do link de agendamento", () => {
  it("só aceita as opções da lista", () => {
    expect(antecedenciaValida(120)).toBe(true);
    expect(antecedenciaValida(45)).toBe(false);
    expect(diasAFrenteValido(30)).toBe(true);
    expect(diasAFrenteValido(10)).toBe(false);
  });

  it("primeiro horário aceito soma a antecedência", () => {
    expect(primeiroHorarioAceito(regras, agora)).toEqual(new Date("2026-11-25T15:00:00Z"));
  });

  it("7 dias à frente: de hoje até hoje + 6", () => {
    expect(diaDentroDoPeriodo(dia(0), hoje, regras)).toBe(true);
    expect(diaDentroDoPeriodo(dia(6), hoje, regras)).toBe(true);
    expect(diaDentroDoPeriodo(dia(7), hoje, regras)).toBe(false);
    expect(diaDentroDoPeriodo(dia(-1), hoje, regras)).toBe(false);
  });

  it("explica o motivo com as palavras da barbearia", () => {
    expect(motivoForaDasRegras(new Date("2026-11-25T14:00:00Z"), dia(0), hoje, regras, agora)).toBe(
      "Esta barbearia pede pelo menos 2 horas de antecedência. Escolha um horário mais tarde.",
    );
    expect(motivoForaDasRegras(new Date("2026-12-03T14:00:00Z"), dia(8), hoje, regras, agora)).toMatch(/até 7 dias/);
    expect(motivoForaDasRegras(new Date("2026-11-25T16:00:00Z"), dia(0), hoje, regras, agora)).toBeNull();
  });

  it("sem mínimo, horário passado continua recusado", () => {
    expect(motivoForaDasRegras(new Date("2026-11-25T12:00:00Z"), dia(0), hoje, { ...regras, antecedenciaMinimaMin: 0 }, agora)).toBe(
      "Esse horário já passou.",
    );
  });
});
