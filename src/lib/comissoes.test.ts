import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({ consultas: [] as { where: Record<string, unknown> }[], linhas: [] as unknown[] }));

vi.mock("./prisma", () => ({
  prisma: {
    agendamento: {
      findMany: async (args: { where: Record<string, unknown> }) => {
        estado.consultas.push(args);
        return estado.linhas;
      },
    },
  },
}));

const { atendimentosComComissao, resumirPorProfissional, totalizar } = await import("./comissoes");

const periodo = { inicio: new Date("2026-11-01T03:00:00Z"), fim: new Date("2026-12-01T02:59:59Z") };

function linha(id: string, barbeiro: { id: string; nome: string }, valores: number[], comissao: number | null, percentual: number | null = 40) {
  return {
    id,
    inicio: new Date("2026-11-10T13:00:00Z"),
    comissaoPercentual: comissao === null ? null : percentual,
    comissaoValor: comissao,
    cliente: { nome: "Cliente" },
    servico: { nome: "Corte" },
    barbeiro,
    caixaLancamentos: valores.map((valor) => ({ valor })),
  };
}

const joao = { id: "p1", nome: "João" };
const rio = { id: "p2", nome: "Rio" };

describe("extrato de comissões", () => {
  beforeEach(() => {
    estado.consultas = [];
    estado.linhas = [];
  });

  it("o barbeiro só enxerga os próprios atendimentos", async () => {
    await atendimentosComComissao("b1", { ...periodo, profissionalId: "p1" });
    expect(estado.consultas[0].where).toMatchObject({ barbeariaId: "b1", status: "CONCLUIDO", barbeiroId: "p1" });
  });

  it("o dono, sem filtro, vê a equipe toda", async () => {
    await atendimentosComComissao("b1", periodo);
    expect(estado.consultas[0].where).not.toHaveProperty("barbeiroId");
  });

  it("recebido soma sinal e restante; comissão vem da conclusão", async () => {
    estado.linhas = [linha("a1", joao, [10, 30.1], 16)];
    const [a] = await atendimentosComComissao("b1", periodo);
    expect(a).toMatchObject({ recebido: 40.1, comissao: 16, percentual: 40, profissionalNome: "João" });
  });

  it("soma por profissional e separa os sem percentual", async () => {
    estado.linhas = [
      linha("a1", joao, [40], 16),
      linha("a2", joao, [30], 12),
      linha("a3", joao, [25], null),
      linha("a4", rio, [50], 25, 50),
    ];
    const atendimentos = await atendimentosComComissao("b1", periodo);
    const resumo = resumirPorProfissional(atendimentos);
    expect(resumo.map((r) => r.nome)).toEqual(["João", "Rio"]);
    expect(resumo[0]).toMatchObject({ atendimentos: 3, semPercentual: 1, faturamento: 95, comissao: 28 });
    expect(totalizar(atendimentos)).toEqual({ atendimentos: 4, faturamento: 145, comissao: 53, semPercentual: 1 });
  });

  it("não acumula erro de centavos", async () => {
    estado.linhas = Array.from({ length: 10 }, (_, i) => linha(`a${i}`, joao, [0.1, 0.2], 0.1));
    const total = totalizar(await atendimentosComComissao("b1", periodo));
    expect(total.faturamento).toBe(3);
    expect(total.comissao).toBe(1);
  });
});
