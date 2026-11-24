import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifesto from "../../docs/images/carrossel.json";
import { PREVIAS } from "./previas";

const raiz = path.resolve(__dirname, "../..");

describe("prévias do carrossel", () => {
  it("seguem a ordem e os textos do manifesto de docs/images", () => {
    expect(PREVIAS.map((p) => p.ordem)).toEqual([1, 2, 3, 4, 5]);
    expect(PREVIAS[0].titulo).toBe("Seu dia em um só lugar.");
    for (const p of PREVIAS) {
      expect(p.alt).toMatch(/^Prévia ilustrativa/);
      expect([p.largura, p.altura]).toEqual([1920, 1080]);
    }
  });

  it("cada arte publicada em public/images/barbium é a mesma da origem", () => {
    for (const slide of manifesto.slides) {
      const origem = path.join(raiz, "docs/images", slide.webp);
      const publicada = path.join(raiz, "public/images/barbium", slide.webp);
      expect(fs.existsSync(publicada), `${slide.webp} não publicada; rode node scripts/publicar-imagens.mjs`).toBe(true);
      expect(fs.readFileSync(publicada).equals(fs.readFileSync(origem))).toBe(true);
    }
  });
});
