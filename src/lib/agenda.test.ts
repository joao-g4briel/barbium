import { beforeEach, describe, expect, it, vi } from "vitest";

// horariosLivres lê expediente, agendamentos e bloqueios do banco; aqui o
// banco é simulado pra testar só a regra de montar a grade.
const banco = vi.hoisted(() => ({
  expediente: null as null | Record<string, unknown>,
  agendamentos: [] as { inicio: Date; fim: Date }[],
  bloqueios: [] as { inicio: Date; fim: Date | null }[],
}));

vi.mock("./prisma", () => ({
  prisma: {
    expedienteDia: { findUnique: async () => banco.expediente },
    agendamento: { findMany: async () => banco.agendamentos },
    bloqueioAgenda: { findMany: async () => banco.bloqueios },
  },
}));
vi.mock("./sinal", () => ({ liberarSinaisExpirados: async () => {} }));

const { horariosLivres } = await import("./agenda");

// Quarta-feira, 04/11/2026. Brasília = UTC - 3h.
const DIA = new Date("2026-11-04T00:00:00Z");
const br = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2026, 10, 4, h + 3, m));
};
const horas = (lista: Date[]) => lista.map((d) => new Date(d.getTime() - 3 * 36e5).toISOString().slice(11, 16));

const buscar = (duracaoMinutos: number, extras: { passoMinutos?: number; aceitarDesde?: Date } = {}) =>
  horariosLivres({
    barbeariaId: "b",
    profissionalId: "p",
    data: DIA,
    duracaoMinutos,
    aceitarDesde: new Date("2026-01-01T00:00:00Z"),
    ...extras,
  });

describe("horários livres", () => {
  beforeEach(() => {
    banco.expediente = { atende: true, horaInicio: "09:00", horaFim: "12:00", almocoInicio: null, almocoFim: null };
    banco.agendamentos = [];
    banco.bloqueios = [];
  });

  it("monta a grade dentro do expediente, no horário de Brasília", async () => {
    expect(horas(await buscar(60))).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("não oferece horário que termina depois do expediente", async () => {
    expect(horas(await buscar(45, { passoMinutos: 15 })).at(-1)).toBe("11:15");
  });

  it("dia sem atendimento não tem horário", async () => {
    banco.expediente = { ...banco.expediente, atende: false };
    expect(await buscar(30)).toEqual([]);
  });

  it("sem expediente cadastrado não tem horário", async () => {
    banco.expediente = null;
    expect(await buscar(30)).toEqual([]);
  });

  it("pula horários que colidem com agendamento", async () => {
    banco.agendamentos = [{ inicio: br("10:00"), fim: br("10:30") }];
    expect(horas(await buscar(30))).toEqual(["09:00", "09:30", "10:30", "11:00", "11:30"]);
  });

  it("agendamento encostado (termina quando o outro começa) não conflita", async () => {
    banco.agendamentos = [{ inicio: br("09:00"), fim: br("09:30") }];
    expect(horas(await buscar(30))[0]).toBe("09:30");
  });

  it("respeita o almoço", async () => {
    banco.expediente = { ...banco.expediente, horaFim: "14:00", almocoInicio: "12:00", almocoFim: "13:00" };
    expect(horas(await buscar(60))).toEqual(["09:00", "10:00", "11:00", "13:00"]);
  });

  it("bloqueio sem data de fim fecha o resto do dia", async () => {
    banco.bloqueios = [{ inicio: br("10:00"), fim: null }];
    expect(horas(await buscar(60))).toEqual(["09:00"]);
  });

  it("não oferece horário que já passou", async () => {
    expect(horas(await buscar(60, { aceitarDesde: br("10:30") }))).toEqual(["11:00"]);
  });
});
