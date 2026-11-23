import { describe, expect, it } from "vitest";
import { estaEmAberto, transicaoPermitida } from "./status-agendamento";

describe("status do agendamento", () => {
  it("o caminho normal: confirmado → chegou → em atendimento → concluído", () => {
    expect(transicaoPermitida("CONFIRMADO", "CHEGOU")).toBe(true);
    expect(transicaoPermitida("CHEGOU", "EM_ATENDIMENTO")).toBe(true);
    expect(transicaoPermitida("EM_ATENDIMENTO", "CONCLUIDO")).toBe(true);
  });

  it("dá pra pular etapas: concluir direto de confirmado ou de chegou", () => {
    expect(transicaoPermitida("CONFIRMADO", "CONCLUIDO")).toBe(true);
    expect(transicaoPermitida("CHEGOU", "CONCLUIDO")).toBe(true);
  });

  it("desfazer um passo marcado por engano", () => {
    expect(transicaoPermitida("CHEGOU", "CONFIRMADO")).toBe(true);
    expect(transicaoPermitida("EM_ATENDIMENTO", "CHEGOU")).toBe(true);
  });

  it("quem chegou ou está na cadeira não pode virar falta", () => {
    expect(transicaoPermitida("CHEGOU", "FALTA")).toBe(false);
    expect(transicaoPermitida("EM_ATENDIMENTO", "FALTA")).toBe(false);
    expect(transicaoPermitida("CONFIRMADO", "FALTA")).toBe(true);
  });

  it("concluído, falta e cancelado só reabrem (voltam pra confirmado)", () => {
    expect(transicaoPermitida("CONCLUIDO", "CHEGOU")).toBe(false);
    expect(transicaoPermitida("FALTA", "CONCLUIDO")).toBe(false);
    expect(transicaoPermitida("CANCELADO", "CONFIRMADO")).toBe(true);
  });

  it("mesmo status de novo não é mudança", () => {
    expect(transicaoPermitida("CHEGOU", "CHEGOU")).toBe(false);
  });

  it("em aberto: o que ainda vai ou está acontecendo", () => {
    expect(["CONFIRMADO", "CHEGOU", "EM_ATENDIMENTO"].every((s) => estaEmAberto(s as never))).toBe(true);
    expect(["CONCLUIDO", "FALTA", "CANCELADO", "AGUARDANDO_PAGAMENTO"].some((s) => estaEmAberto(s as never))).toBe(false);
  });
});
