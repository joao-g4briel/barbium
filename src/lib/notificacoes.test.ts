import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

const { montarMensagem, montarMensagemCliente, quandoRelativo } = await import("./notificacoes");
const { numeroWhatsApp } = await import("./formatar");

const dados = {
  quando: "Quarta-feira, 04/11 às 09:30",
  cliente: "João Silva",
  telefone: "(11) 98765-4321",
  servico: "Corte",
  profissional: "Rio",
  sinalPago: null,
  barbearia: "Barbearia RIO",
  telefoneBarbearia: "(81) 98947-9982" as string | null,
};

describe("mensagem de notificação", () => {
  it("novo agendamento traz cliente, serviço, profissional e horário", () => {
    const texto = montarMensagem("agendamento.confirmado", dados);
    expect(texto).toContain("Novo agendamento");
    expect(texto).toContain("João Silva");
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

  it("cliente cancelou pelo link: a barbearia sabe que o horário ficou livre e do sinal", () => {
    const texto = montarMensagem("agendamento.cancelado_pelo_cliente", { ...dados, sinalPago: 20 });
    expect(texto).toContain("Cliente cancelou pelo link");
    expect(texto).toContain("João Silva");
    expect(texto).toContain("O horário já está livre");
    expect(texto).toContain("continua no caixa");
  });

  it("cliente remarcou pelo link: mostra de onde saiu e pra onde foi", () => {
    const texto = montarMensagem("agendamento.remarcado_pelo_cliente", {
      ...dados,
      quandoAnterior: "Terça-feira, 03/11 às 10:00",
    });
    expect(texto).toContain("Cliente remarcou pelo link");
    expect(texto).toContain("*Antes:* Terça-feira, 03/11 às 10:00");
    expect(texto).toContain("*Agora:* Quarta-feira, 04/11 às 09:30");
    expect(texto).not.toContain("*Quando:*");
  });
});

describe("mensagem para o cliente", () => {
  it("cumprimenta pelo primeiro nome e confirma o horário na barbearia", () => {
    const texto = montarMensagemCliente(dados);
    expect(texto).toContain("Olá, João!");
    expect(texto).toContain("*Barbearia RIO* está marcado");
    expect(texto).toContain("Quarta-feira, 04/11 às 09:30");
    expect(texto).toContain("Corte");
  });

  it("sem link, diz com quem falar pra remarcar", () => {
    expect(montarMensagemCliente(dados)).toContain("Fale com a barbearia: (81) 98947-9982");
    expect(montarMensagemCliente({ ...dados, telefoneBarbearia: null })).toContain("Fale com a barbearia.\n");
  });

  it("com link, manda o cliente mudar ou cancelar por ele", () => {
    const link = "https://barbium.vercel.app/meu-horario/abc.def";
    for (const evento of ["agendamento.confirmado", "agendamento.remarcado", "agendamento.lembrete"] as const) {
      const texto = montarMensagemCliente({ ...dados, linkCliente: link }, evento);
      expect(texto).toContain(`Precisa remarcar ou cancelar? ${link}`);
      expect(texto).not.toContain("Fale com a barbearia:");
    }
  });

  it("cancelado pelo cliente: confirma e oferece marcar outro", () => {
    const texto = montarMensagemCliente(
      { ...dados, sinalPago: 20, linkAgendar: "https://barbium.vercel.app/agendar/rio" },
      "agendamento.cancelado_pelo_cliente",
    );
    expect(texto).toContain("foi cancelado, como você pediu");
    expect(texto).toContain("Corte com Rio, Quarta-feira, 04/11 às 09:30");
    expect(texto).toMatch(/sinal de R\$\s20,00/);
    expect(texto).toContain("Quer marcar outro horário? https://barbium.vercel.app/agendar/rio");
    expect(texto).not.toContain("Precisa remarcar");
  });

  it("explica como parar de receber", () => {
    expect(montarMensagemCliente(dados)).toMatch(/Não quer receber estas mensagens\? É só avisar a barbearia\._$/);
  });

  it("não mostra o telefone do próprio cliente", () => {
    expect(montarMensagemCliente(dados)).not.toContain("98765-4321");
  });

  it("mostra o sinal quando foi pago", () => {
    expect(montarMensagemCliente({ ...dados, sinalPago: 22.5 })).toMatch(/Sinal pago:\* R\$\s22,50/);
  });

  it("lembrete chama o cliente pro horário", () => {
    const texto = montarMensagemCliente(dados, "agendamento.lembrete");
    expect(texto).toContain("Olá, João! ⏰");
    expect(texto).toContain("Passando pra lembrar do seu horário na *Barbearia RIO*");
    expect(texto).toContain("Fale com a barbearia");
    expect(texto).toMatch(/É só avisar a barbearia\._$/);
  });

  it("lembrete diz hoje ou amanhã, e a data por extenso quando é mais longe", () => {
    // 23:30 de quarta em Brasília; o horário é quinta às 09:00.
    const agora = new Date("2026-11-05T02:30:00Z");
    const quinta9h = new Date("2026-11-05T12:00:00Z");
    expect(quandoRelativo(quinta9h, agora, "x")).toBe("Amanhã às 09:00");
    expect(quandoRelativo(quinta9h, new Date("2026-11-05T11:00:00Z"), "x")).toBe("Hoje às 09:00");
    expect(quandoRelativo(quinta9h, new Date("2026-11-03T12:00:00Z"), "Quinta-feira, 05/11 às 09:00")).toBe(
      "Quinta-feira, 05/11 às 09:00",
    );
  });

  it("horário remarcado avisa que mudou e mostra o novo horário", () => {
    const texto = montarMensagemCliente(dados, "agendamento.remarcado");
    expect(texto).toContain("*Barbearia RIO* mudou");
    expect(texto).toContain("*Novo horário:* Quarta-feira, 04/11 às 09:30");
    expect(texto).not.toContain("está marcado");
    expect(texto).toMatch(/É só avisar a barbearia\._$/);
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
