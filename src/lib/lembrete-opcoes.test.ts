import { describe, expect, it } from "vitest";
import { dentroDaJanelaDeLembrete, lembreteValido, rotuloLembrete } from "./lembrete-opcoes";

describe("opções de lembrete", () => {
  it("aceita só as antecedências oferecidas", () => {
    expect(lembreteValido(2)).toBe(true);
    expect(lembreteValido(24)).toBe(true);
    expect(lembreteValido(5)).toBe(false);
    expect(lembreteValido(0)).toBe(false);
  });

  it("escreve a antecedência por extenso", () => {
    expect(rotuloLembrete(1)).toBe("1 hora antes");
    expect(rotuloLembrete(3)).toBe("3 horas antes");
    expect(rotuloLembrete(24)).toBe("1 dia antes");
  });

  it("sabe se o horário já está dentro da janela do lembrete", () => {
    const agora = new Date("2026-11-26T12:00:00Z");
    const daqui = (min: number) => new Date(agora.getTime() + min * 60e3);
    expect(dentroDaJanelaDeLembrete(daqui(90), 2, agora)).toBe(true);
    expect(dentroDaJanelaDeLembrete(daqui(120), 2, agora)).toBe(true);
    expect(dentroDaJanelaDeLembrete(daqui(121), 2, agora)).toBe(false);
    expect(dentroDaJanelaDeLembrete(daqui(10), null, agora)).toBe(false);
  });
});
