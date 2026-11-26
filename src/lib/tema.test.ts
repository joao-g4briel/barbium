import { describe, expect, it } from "vitest";
import { contraste } from "./cor-marca";
import { FUNDO_PADRAO, FUNDOS_SUGERIDOS, cssDoTema, paletaNeutra, variaveisDoTema } from "./tema";

const FUNDOS = [...FUNDOS_SUGERIDOS.map((f) => f.cor), "#808080", "#ffd400", "#ffffff", "#000000", "#3b0764", "#d1fae5"];
const MARCAS = ["#047857", "#1d4ed8", "#ffd400", "#ffffff", "#111111", "#be185d"];

describe("tema da barbearia", () => {
  it("sem cores (ou só o fundo padrão) não muda nada", () => {
    expect(variaveisDoTema({ corMarca: null, corFundo: null })).toBeNull();
    expect(variaveisDoTema({ corMarca: null, corFundo: FUNDO_PADRAO })).toBeNull();
    expect(variaveisDoTema({ corMarca: "vermelho", corFundo: "#12" })).toBeNull();
  });

  it("só a cor da marca troca só os papéis de marca", () => {
    const v = variaveisDoTema({ corMarca: "#1d4ed8", corFundo: null })!;
    expect(v["--color-primary"]).toBeDefined();
    expect(v["--bg-page"]).toBeUndefined();
  });

  it.each(FUNDOS)("fundo %s: textos e bordas legíveis", (fundo) => {
    const n = paletaNeutra(fundo);
    for (const sobre of [n.fundo, n.superficie, n.elevada, n.elevadaHover, n.campo]) {
      expect(contraste(n.texto, sobre)).toBeGreaterThanOrEqual(7);
      expect(contraste(n.textoSecundario, sobre)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(n.textoApagado, sobre)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contraste(n.bordaCampo, n.fundo)).toBeGreaterThanOrEqual(3);
    expect(contraste(n.bordaCampo, n.superficie)).toBeGreaterThanOrEqual(3);
  });

  it.each(FUNDOS.flatMap((f) => MARCAS.map((m) => [f, m])))("fundo %s com marca %s: botões e destaques legíveis", (fundo, marca) => {
    const v = variaveisDoTema({ corMarca: marca, corFundo: fundo })!;
    const n = paletaNeutra(fundo);
    expect(contraste(v["--color-on-primary"], v["--color-primary"])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(v["--color-accent-text"], n.superficie)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(v["--color-accent-text"], v["--color-selected"])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(v["--color-accent"], n.fundo)).toBeGreaterThanOrEqual(3);
  });

  it("fundo claro vira tema claro, com avisos próprios", () => {
    const v = variaveisDoTema({ corMarca: null, corFundo: "#f4f5f3" })!;
    expect(v["color-scheme"]).toBe("light");
    expect(v["--success-fg"]).toBe("#047857");
    expect(v["--text-primary"]).toBe("#111614");
    expect(variaveisDoTema({ corMarca: null, corFundo: "#0b1220" })!["color-scheme"]).toBe("dark");
  });

  it("css do tema só tem cores válidas, sem nada que escape da regra", () => {
    const css = cssDoTema({ corMarca: "#1d4ed8", corFundo: "#f3eee5" })!;
    expect(css.startsWith(":root{")).toBe(true);
    expect(css.endsWith("}")).toBe(true);
    expect(css).not.toMatch(/[<>]/);
    expect(css.match(/\{/g)).toHaveLength(1);
  });
});
