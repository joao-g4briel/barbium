import { describe, expect, it } from "vitest";
import { contraste, corValida, paletaDaMarca } from "./cor-marca";

const FUNDO = "#0d1110";
const SUPERFICIE = "#18231c";

describe("cor da marca", () => {
  it("só aceita #rrggbb", () => {
    expect(corValida("#1d4ed8")).toBe(true);
    expect(corValida("1d4ed8")).toBe(false);
    expect(corValida("#fff")).toBe(false);
    expect(corValida("red")).toBe(false);
    expect(paletaDaMarca("vermelho")).toBeNull();
  });

  it.each(["#047857", "#1d4ed8", "#b91c1c", "#ffd400", "#111111", "#ffffff", "#7c3aed", "#808080", "#22c55e"])(
    "garante contraste para %s",
    (cor) => {
      const p = paletaDaMarca(cor)!;
      expect(contraste(p.sobrePrimaria, p.primaria)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.destaqueTexto, SUPERFICIE)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.destaqueTexto, p.selecionado)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.destaque, FUNDO)).toBeGreaterThanOrEqual(3);
    },
  );

  it("cor escura mantém texto branco; cor clara usa texto escuro", () => {
    expect(paletaDaMarca("#1d4ed8")!.sobrePrimaria).toBe("#ffffff");
    expect(paletaDaMarca("#ffd400")!.sobrePrimaria).toBe(FUNDO);
  });
});
