import { describe, expect, it, vi } from "vitest";
import type { DiaSemana } from "@prisma/client";

vi.mock("./prisma", () => ({ prisma: {} }));
const { calcularIndicadores, capacidadeEmMinutos } = await import("./indicadores");

// Semana de segunda 02/11/2026 a domingo 08/11/2026, em Brasília (UTC-3).
const br = (dia: number, hhmm = "00:00") => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2026, 10, dia, h + 3, m));
};
const SEMANA = { inicio: br(2), fim: new Date(br(9).getTime() - 1) };

const dia = (diaSemana: DiaSemana, extras: Partial<{ atende: boolean; almocoInicio: string; almocoFim: string }> = {}) => ({
  diaSemana,
  atende: true,
  horaInicio: "09:00",
  horaFim: "18:00",
  almocoInicio: null as string | null,
  almocoFim: null as string | null,
  ...extras,
});
const UTEIS: DiaSemana[] = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"];

describe("capacidade da agenda", () => {
  it("soma o expediente dos dias em que atende, no horário de Brasília", () => {
    // 5 dias × 9h = 45h
    expect(capacidadeEmMinutos(UTEIS.map((d) => dia(d)), [], SEMANA.inicio, SEMANA.fim)).toBe(45 * 60);
  });

  it("desconta o almoço e os dias de folga fixa", () => {
    const expediente = [
      ...UTEIS.map((d) => dia(d, { almocoInicio: "12:00", almocoFim: "13:00" })),
      dia("SABADO", { atende: false }),
    ];
    expect(capacidadeEmMinutos(expediente, [], SEMANA.inicio, SEMANA.fim)).toBe(40 * 60);
  });

  it("desconta férias e folgas, sem contar duas vezes bloqueios sobrepostos", () => {
    const bloqueios = [
      { inicio: br(3, "00:00"), fim: br(4, "00:00") }, // terça inteira
      { inicio: br(3, "10:00"), fim: br(3, "12:00") }, // dentro da terça, já contado
      { inicio: br(5, "14:00"), fim: br(5, "16:00") }, // 2h na quinta
    ];
    expect(capacidadeEmMinutos(UTEIS.map((d) => dia(d)), bloqueios, SEMANA.inicio, SEMANA.fim)).toBe((45 - 9 - 2) * 60);
  });

  it("trava sem data de fim vale até o fim do período", () => {
    const bloqueios = [{ inicio: br(6, "09:00"), fim: null }]; // sexta em diante
    expect(capacidadeEmMinutos(UTEIS.map((d) => dia(d)), bloqueios, SEMANA.inicio, SEMANA.fim)).toBe(36 * 60);
  });
});

function ag(status: string, extras: Record<string, unknown> = {}) {
  return {
    profissionalId: "p1",
    status,
    sinalStatus: null,
    inicio: br(3, "10:00"),
    fim: br(3, "10:30"),
    recebido: status === "CONCLUIDO" ? 40 : 0,
    ...extras,
  } as Parameters<typeof calcularIndicadores>[0][number];
}

describe("indicadores do período", () => {
  it("ticket médio, faltas, cancelamentos e ocupação", () => {
    const r = calcularIndicadores(
      [ag("CONCLUIDO"), ag("CONCLUIDO", { recebido: 60 }), ag("CONCLUIDO", { recebido: 50 }), ag("FALTA"), ag("CANCELADO"), ag("CONFIRMADO")],
      600,
      SEMANA,
    );
    expect(r.faturamento).toBe(150);
    expect(r.ticketMedio).toBe(50);
    expect(r.taxaFaltas).toBe(1 / 4); // 1 falta em 4 que terminaram (3 concluídos + 1 falta)
    expect(r.taxaCancelamento).toBe(1 / 6);
    // 5 não cancelados × 30 min = 150 de 600
    expect(r.minutosOcupados).toBe(150);
    expect(r.ocupacao).toBe(0.25);
  });

  it("Pix de sinal que expirou não conta como cancelamento", () => {
    const r = calcularIndicadores([ag("CONCLUIDO"), ag("CANCELADO", { sinalStatus: "PENDENTE" })], 600, SEMANA);
    expect(r.cancelados).toBe(0);
    expect(r.agendados).toBe(1);
  });

  it("sem base pra calcular, mostra vazio em vez de 0%", () => {
    const r = calcularIndicadores([ag("CONFIRMADO")], 0, SEMANA);
    expect(r.ticketMedio).toBeNull();
    expect(r.taxaFaltas).toBeNull();
    expect(r.ocupacao).toBeNull();
  });

  it("atendimento que atravessa o fim do período conta só a parte de dentro", () => {
    const r = calcularIndicadores(
      [ag("CONFIRMADO", { inicio: new Date(SEMANA.fim.getTime() - 10 * 60000), fim: new Date(SEMANA.fim.getTime() + 20 * 60000) })],
      600,
      SEMANA,
    );
    expect(r.minutosOcupados).toBe(10);
  });
});
