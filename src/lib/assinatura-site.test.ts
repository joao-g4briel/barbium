import { describe, expect, it, vi } from "vitest";
import { DIAS_TESTE } from "./precos";

vi.mock("./prisma", () => ({ prisma: {} }));

const { PRECOS, economia, precoPorMes, linkAssinar, mesesGratis, vantagemDoPeriodo } = await import("./precos");
const { acessoVencido, diasRestantes } = await import("./acesso");
const { estadoWhatsapp, whatsappLigado } = await import("./whatsapp-adicional");
const { slugDoNome, slugDisponivel, fimDoTeste, cadastroSchema } = await import("./cadastro");

describe("preços", () => {
  it("são os valores combinados", () => {
    expect(PRECOS.SOLO).toEqual({ MENSAL: 60, SEMESTRAL: 324, ANUAL: 600 });
    expect(PRECOS.BARBEARIA).toEqual({ MENSAL: 90, SEMESTRAL: 486, ANUAL: 900 });
    expect(PRECOS.REDE).toEqual({ MENSAL: 140, SEMESTRAL: 756, ANUAL: 1400 });
  });

  it("calcula o valor por mês e a economia sobre o mensal", () => {
    expect(precoPorMes("SOLO", "ANUAL")).toBe(50);
    expect(precoPorMes("REDE", "ANUAL")).toBe(116.67);
    expect(economia("SOLO", "SEMESTRAL")).toBe(10);
    expect(economia("SOLO", "MENSAL")).toBe(0);
  });

  it("o anual dá 2 meses grátis em todos os planos, e o semestral sai 10% mais barato", () => {
    for (const plano of ["SOLO", "BARBEARIA", "REDE"] as const) {
      expect(mesesGratis(plano, "ANUAL")).toBe(2);
      expect(vantagemDoPeriodo(plano, "ANUAL")).toBe("2 meses grátis");
      expect(vantagemDoPeriodo(plano, "SEMESTRAL")).toBe("10% a menos que o mensal");
      expect(vantagemDoPeriodo(plano, "MENSAL")).toBeNull();
    }
  });

  it("cada plano e período tem o seu checkout da Cakto", () => {
    const links = new Set<string>();
    for (const plano of ["SOLO", "BARBEARIA", "REDE"] as const) {
      for (const periodo of ["MENSAL", "SEMESTRAL", "ANUAL"] as const) {
        const link = linkAssinar(plano, periodo, plano);
        expect(link).toMatch(/^https:\/\/pay\.cakto\.com\.br\/\w+/);
        links.add(link);
      }
    }
    expect(links.size).toBe(9);
    expect(linkAssinar("BARBEARIA", "SEMESTRAL", "Barbearia")).toBe("https://pay.cakto.com.br/33ydgax");
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
    expect(diasRestantes({ acessoAte: fimDoTeste(agora) }, agora)).toBe(DIAS_TESTE);
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
      aceite: true,
    };
    expect(cadastroSchema.safeParse(base).success).toBe(true);
    expect(cadastroSchema.safeParse({ ...base, site: "http://spam" }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...base, whatsapp: "98947-9982" }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...base, senha: "123" }).success).toBe(false);
    expect(cadastroSchema.safeParse({ ...base, aceite: false }).success).toBe(false);
    const semAceite: Partial<typeof base> = { ...base };
    delete semAceite.aceite;
    expect(cadastroSchema.safeParse(semAceite).success).toBe(false);
  });
});

describe("adicional de WhatsApp", () => {
  const agora = new Date("2026-11-24T12:00:00Z");
  const futuro = new Date("2026-12-01T12:00:00Z");
  const passado = new Date("2026-11-20T12:00:00Z");

  it("no teste grátis, as mensagens saem mesmo sem o adicional", () => {
    expect(estadoWhatsapp({ whatsappAtivo: false, emTeste: true, acessoAte: futuro }, agora)).toBe("teste");
  });
  it("teste acabou sem pagar: desliga", () => {
    expect(whatsappLigado({ whatsappAtivo: false, emTeste: true, acessoAte: passado }, agora)).toBe(false);
  });
  it("pagou a assinatura sem o adicional: desliga", () => {
    expect(estadoWhatsapp({ whatsappAtivo: false, emTeste: false, acessoAte: futuro }, agora)).toBe("desligado");
    expect(estadoWhatsapp({ whatsappAtivo: false, emTeste: false, acessoAte: null }, agora)).toBe("desligado");
  });
  it("com o adicional, liga; com o acesso vencido, nem o adicional manda", () => {
    expect(estadoWhatsapp({ whatsappAtivo: true, emTeste: false, acessoAte: futuro }, agora)).toBe("adicional");
    expect(estadoWhatsapp({ whatsappAtivo: true, emTeste: false, acessoAte: null }, agora)).toBe("adicional");
    expect(whatsappLigado({ whatsappAtivo: true, emTeste: false, acessoAte: passado }, agora)).toBe(false);
  });
});
