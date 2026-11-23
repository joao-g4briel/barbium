import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  enviados: [] as { para: string; mensagem: string }[],
  bancoFora: false,
  contagem: new Map<string, number>(),
}));

vi.mock("./notificacoes", () => ({
  notificacoesConfiguradas: () => true,
  postarWebhook: async (corpo: { para: string; mensagem: string }) => {
    estado.enviados.push(corpo);
  },
}));
vi.mock("./limite-tentativas", () => ({
  consumirTentativa: async (chave: string, maximo: number) => {
    if (estado.bancoFora) throw new Error("banco fora do ar");
    const n = (estado.contagem.get(chave) ?? 0) + 1;
    estado.contagem.set(chave, n);
    return n <= maximo;
  },
}));

const { alertarErro } = await import("./alerta-erro");

describe("alerta de erro no WhatsApp da plataforma", () => {
  beforeEach(() => {
    estado.enviados = [];
    estado.bancoFora = false;
    estado.contagem.clear();
    process.env.PLATAFORMA_WHATSAPP = "(81) 99299-2758";
  });

  it("manda onde e qual foi o erro", async () => {
    await alertarErro(new Error("conexão recusada"), "GET /painel/agenda", "abc123");
    expect(estado.enviados).toHaveLength(1);
    expect(estado.enviados[0].para).toBe("5581992992758");
    expect(estado.enviados[0].mensagem).toContain("GET /painel/agenda");
    expect(estado.enviados[0].mensagem).toContain("conexão recusada");
    expect(estado.enviados[0].mensagem).toContain("abc123");
  });

  it("o mesmo erro na mesma rota avisa uma vez só", async () => {
    for (let i = 0; i < 5; i++) await alertarErro(new Error("quebrou"), "GET /painel");
    expect(estado.enviados).toHaveLength(1);
  });

  it("erros diferentes avisam separado", async () => {
    await alertarErro(new Error("quebrou"), "GET /painel");
    await alertarErro(new Error("outro problema"), "GET /painel");
    await alertarErro(new Error("quebrou"), "POST /api/painel/clientes");
    expect(estado.enviados).toHaveLength(3);
  });

  it("com o banco fora do ar, ainda avisa, mas sem enxurrada", async () => {
    estado.bancoFora = true;
    for (let i = 0; i < 5; i++) await alertarErro(new Error("banco caiu"), "GET /painel/caixa");
    expect(estado.enviados).toHaveLength(1);
  });

  it("corta mensagem de erro muito longa", async () => {
    await alertarErro(new Error("x".repeat(1000)), "GET /painel");
    expect(estado.enviados[0].mensagem.length).toBeLessThan(600);
  });

  it("sem número da plataforma configurado, não manda nada", async () => {
    delete process.env.PLATAFORMA_WHATSAPP;
    await alertarErro(new Error("quebrou"), "GET /painel");
    expect(estado.enviados).toHaveLength(0);
  });
});
