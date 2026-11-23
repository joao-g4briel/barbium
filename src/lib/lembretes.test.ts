import { beforeEach, describe, expect, it, vi } from "vitest";

// Banco e webhook simulados: testa só a regra de quem recebe o lembrete.
const estado = vi.hoisted(() => ({
  agendamentos: [] as Record<string, unknown>[],
  marcados: new Set<string>(),
  consultas: [] as { where: { inicio: { gt: Date; lte: Date } } }[],
  enviados: [] as { para: string; mensagem: string; evento: string }[],
  webhookFora: false,
}));

vi.mock("./prisma", () => ({
  prisma: {
    barbearia: { findMany: async () => [{ id: "b1", lembreteHorasAntes: 2 }] },
    agendamento: {
      findMany: async (args: { where: { inicio: { gt: Date; lte: Date } } }) => {
        estado.consultas.push(args);
        return estado.agendamentos;
      },
      updateMany: async ({ where }: { where: { id: string } }) => {
        if (estado.marcados.has(where.id)) return { count: 0 };
        estado.marcados.add(where.id);
        return { count: 1 };
      },
    },
  },
}));
vi.mock("./notificacoes", async (original) => ({
  ...(await original<typeof import("./notificacoes")>()),
  postarWebhook: async (corpo: { para: string; mensagem: string; evento: string }) => {
    if (estado.webhookFora) throw new Error("n8n fora do ar");
    estado.enviados.push(corpo);
  },
}));

const { enviarLembretesPendentes } = await import("./lembretes");

// Quinta, 26/11/2026, 13:00 em Brasília (16:00 UTC).
const AGORA = new Date("2026-11-26T16:00:00Z");
const hora = (h: number) => new Date(AGORA.getTime() + h * 36e5);

function agendamento(id: string, extras: Record<string, unknown> = {}) {
  return {
    id,
    inicio: hora(1.5), // 14:30, dentro da janela de 2h
    criadoEm: hora(-48), // marcado dois dias antes
    sinalStatus: null,
    sinalValor: null,
    cliente: { nome: "Maria Souza", telefone: "11987654321", aceitaMensagens: true },
    servico: { nome: "Corte", preco: 40 },
    barbeiro: { nome: "Rio" },
    barbearia: { id: "b1", nome: "Barbearia RIO", slug: "rio", telefone: "81989479982", telefoneAvisos: null },
    ...extras,
  };
}

describe("lembrete antes do horário", () => {
  beforeEach(() => {
    estado.agendamentos = [];
    estado.marcados.clear();
    estado.consultas = [];
    estado.enviados = [];
    estado.webhookFora = false;
  });

  it("procura só os horários dentro da janela escolhida pela barbearia", async () => {
    await enviarLembretesPendentes(AGORA);
    const { gt, lte } = estado.consultas[0].where.inicio;
    expect(lte.getTime()).toBe(hora(2).getTime());
    // Faltando menos de 10 minutos, já não adianta lembrar.
    expect(gt.getTime()).toBe(AGORA.getTime() + 10 * 60e3);
  });

  it("manda o lembrete pro cliente, com 'hoje às'", async () => {
    estado.agendamentos = [agendamento("a1")];
    const r = await enviarLembretesPendentes(AGORA);
    expect(r).toEqual({ enviados: 1, dispensados: 0, falhas: 0 });
    expect(estado.enviados[0].para).toBe("5511987654321");
    expect(estado.enviados[0].evento).toBe("agendamento.lembrete");
    expect(estado.enviados[0].mensagem).toContain("Passando pra lembrar");
    expect(estado.enviados[0].mensagem).toContain("*Quando:* Hoje às 14:30");
    expect(estado.marcados.has("a1")).toBe(true);
  });

  it("não manda de novo o que já foi marcado (duas chamadas ao mesmo tempo)", async () => {
    estado.agendamentos = [agendamento("a1")];
    estado.marcados.add("a1");
    const r = await enviarLembretesPendentes(AGORA);
    expect(r.enviados).toBe(0);
    expect(estado.enviados).toHaveLength(0);
  });

  it("marcado em cima da hora não recebe lembrete (a confirmação basta)", async () => {
    estado.agendamentos = [agendamento("a1", { criadoEm: hora(-0.25) })];
    const r = await enviarLembretesPendentes(AGORA);
    expect(r).toEqual({ enviados: 0, dispensados: 1, falhas: 0 });
    expect(estado.marcados.has("a1")).toBe(true);
  });

  it("cliente que pediu pra não receber fica sem lembrete", async () => {
    estado.agendamentos = [
      agendamento("a1", { cliente: { nome: "Maria", telefone: "11987654321", aceitaMensagens: false } }),
    ];
    const r = await enviarLembretesPendentes(AGORA);
    expect(r).toEqual({ enviados: 0, dispensados: 1, falhas: 0 });
  });

  it("n8n fora do ar conta como falha, sem derrubar os outros", async () => {
    estado.agendamentos = [agendamento("a1"), agendamento("a2")];
    estado.webhookFora = true;
    const r = await enviarLembretesPendentes(AGORA);
    expect(r).toEqual({ enviados: 0, dispensados: 0, falhas: 2 });
  });
});
