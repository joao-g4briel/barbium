import { describe, expect, it } from "vitest";
import { formatarHora, formatarTelefone, linkWhatsApp } from "./formatar";

describe("telefone", () => {
  it("formata celular e fixo com DDD", () => {
    expect(formatarTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(formatarTelefone("1133334444")).toBe("(11) 3333-4444");
  });

  it("aceita telefone com +55 e já formatado", () => {
    expect(formatarTelefone("+55 (11) 98765-4321")).toBe("(11) 98765-4321");
  });

  it("link do WhatsApp só com DDD", () => {
    expect(linkWhatsApp("(11) 98765-4321")).toBe("https://wa.me/5511987654321");
    expect(linkWhatsApp("5511987654321")).toBe("https://wa.me/5511987654321");
    expect(linkWhatsApp("98765-4321")).toBeNull();
  });
});

describe("formatarHora em outro fuso", () => {
  it("mostra a hora local da barbearia", () => {
    const instante = new Date("2026-11-04T13:00:00Z");
    expect(formatarHora(instante)).toBe("10:00");
    expect(formatarHora(instante, "America/Manaus")).toBe("09:00");
  });
});
