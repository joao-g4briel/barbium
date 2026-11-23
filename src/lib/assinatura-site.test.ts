import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

const { PRECOS, economia, precoPorMes, linkAssinar } = await import("./precos");
const { acessoVencido, diasRestantes } = await import("./acesso");
const { slugDoNome, slugDisponivel, fimDoTeste, cadastroSchema } = await import("./cadastro");

describe("preços", () => {
  it("são os valores combinados", () => {
    expect(PRECOS.SOLO).toEqual({ MENSAL: 60, SEMESTRAL: 252, ANUAL: 504 });
    expect(PRECOS.BARBEARIA).toEqual({ MENSAL: 90, SEMESTRAL: 282, ANUAL: 534 });
    expect(PRECOS.REDE).toEqual({ MENSAL: 140, SEMESTRAL: 332, ANUAL: 584 });
  });

  it("calcula o valor por mês e a economia sobre o mensal", () => {
    expect(precoPorMes("SOLO", "ANUAL")).toBe(42);
    expect(economia("SOLO", "ANUAL")).toBe(30);
    expect(economia("SOLO", "MENSAL")).toBe(0);
  });

  it("sem link da Cakto, o botão vai pro WhatsApp com o plano escolhido", () => {
    const link = linkAssinar("BARBEARIA", "SEMESTRAL", "Barbearia");
    expect(link).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(link)).toContain("plano Barbearia semestral");
  });
});

describe("prazo de acesso", () => {
  const agora = new Date("2026-11-24T12:00:00Z");
  it("sem data, nunca vence", () => {
    expect(acessoVencido({ acessoAte: null }, agora)).toBe(false);
    expect(diasRestantes({ acessoAte: null }, agora)).toBeNull();
  });
  it("vence na hora marcada", () => {
    expect(acessoVencido({ acessoAte: new Date("2026-11-24T11:59:59Z") }, agora)).toBe(true);
    expect(acessoVencido({ acessoAte: new Date("2026-11-24T12:00:01Z") }, agora)).toBe(false);
  });
  it("conta os dias que faltam arredondando pra cima", () => {
    expect(diasRestantes({ acessoAte: new Date("2026-11-24T13:00:00Z") }, agora)).toBe(1);
    expect(diasRestantes({ acessoAte: fimDoTeste(agora) }, agora)).toBe(7);
  });
});

describe("cadastro pelo site", () => {
  it("monta o link da barbearia a partir do nome", () => {
    expect(slugDoNome("Barbearia do Zé & Filhos")).toBe("barbearia-do-ze-filhos");
    expect(slugDoNome("  ÁÉÍ  ")).toBe("aei");
    expect(slugDoNome("!!")).toBe("barbearia");
  });

  it("usa o primeiro link livre", async () => {
    const db = { barbearia: { findMany: async () => [{ slug: "rio" }, { slug: "rio-2" }] } };
    expect(await slugDisponivel(db as never, "Rio")).toBe("rio-3");
    const vazio = { barbearia: { findMany: async () => [] } };
    expect(await slugDisponivel(vazio as never, "Rio")).toBe("rio");
  });

  it("recusa robô (campo escondido preenchido) e dados incompletos", () => {
    const base = {
      nomeBarbearia: "Barbearia Rio",
      nome: "Rio",
      email: "rio@exemplo.com",
      whatsapp: "(81) 98947-9982",
      senha: "12345678",
      plano: "SOLO",
    };
    expect(cadastroSchema.safeParse(base).success).toBe(true);
    expect(cadastroSchema.safeParse({ ...base, site: "http://spam" }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...base, whatsapp: "98947-9982" }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...base, senha: "123" }).success).toBe(false);
  });
});
