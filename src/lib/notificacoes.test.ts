import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

const { montarMensagem } = await import("./notificacoes");
const { numeroWhatsApp } = await import("./formatar");

const dados = {
  quando: "Quarta-feira, 04/11 às 09:30",
  cliente: "João",
  telefone: "(11) 98765-4321",
  servico: "Corte",
  profissional: "Rio",
  sinalPago: null,
};

describe("mensagem de notificação", () => {
  it("novo agendamento traz cliente, serviço, profissional e horário", () => {
    const texto = montarMensagem("agendamento.confirmado", dados);
    expect(texto).toContain("Novo agendamento");
    expect(texto).toContain("João");
    expect(texto).toContain("Corte");
    expect(texto).toContain("Quarta-feira, 04/11 às 09:30");
    expect(texto).not.toContain("Sinal");
  });

  it("mostra o sinal quando foi pago", () => {
    expect(montarMensagem("agendamento.confirmado", { ...dados, sinalPago: 22.5 })).toMatch(/Sinal pago:\* R\$\s22,50/);
  });

  it("sinal pago sem horário pede pra devolver ou remarcar", () => {
    const texto = montarMensagem("sinal.pago_sem_horario", { ...dados, sinalPago: 22.5 });
    expect(texto).toContain("já foi ocupado");
    expect(texto).toContain("devolva o sinal");
  });
});

describe("número do WhatsApp", () => {
  it("põe o 55 na frente de número com DDD", () => {
    expect(numeroWhatsApp("(81) 98510-3176")).toBe("5581985103176");
    expect(numeroWhatsApp("5581985103176")).toBe("5581985103176");
  });

  it("sem DDD não dá pra saber o número", () => {
    expect(numeroWhatsApp("98510-3176")).toBeNull();
    expect(numeroWhatsApp("")).toBeNull();
  });
});
