import { describe, expect, it } from "vitest";
import {
  descreverUsos,
  estenderValidade,
  mesDoPlano,
  motivoParaNaoUsarPlano,
  situacaoAssinatura,
} from "./planos-corte-regras";

const d = (iso: string) => new Date(iso);
const DIA = 24 * 60 * 60 * 1000;

describe("situacaoAssinatura", () => {
  const agora = d("2026-12-01T12:00:00Z");
  it("cancelada vale mais que a validade", () => {
    expect(situacaoAssinatura({ validaAte: d("2026-12-20T00:00:00Z"), canceladaEm: agora }, agora)).toBe("CANCELADA");
  });
  it("sem validade espera o primeiro pagamento", () => {
    expect(situacaoAssinatura({ validaAte: null, canceladaEm: null }, agora)).toBe("AGUARDANDO_PAGAMENTO");
  });
  it("ativa até o instante da validade", () => {
    expect(situacaoAssinatura({ validaAte: d("2026-12-01T12:00:01Z"), canceladaEm: null }, agora)).toBe("ATIVA");
    expect(situacaoAssinatura({ validaAte: agora, canceladaEm: null }, agora)).toBe("VENCIDA");
  });
});

describe("estenderValidade", () => {
  const agora = d("2026-12-01T12:00:00Z");
  it("primeiro pagamento: 30 dias a partir de agora", () => {
    expect(estenderValidade(null, agora)).toEqual(new Date(agora.getTime() + 30 * DIA));
  });
  it("renovação antecipada soma ao fim, sem perder dias", () => {
    const valida = d("2026-12-10T12:00:00Z");
    expect(estenderValidade(valida, agora)).toEqual(new Date(valida.getTime() + 30 * DIA));
  });
  it("vencida recomeça de agora", () => {
    expect(estenderValidade(d("2026-11-20T00:00:00Z"), agora)).toEqual(new Date(agora.getTime() + 30 * DIA));
  });
});

describe("mesDoPlano", () => {
  const valida = d("2026-12-31T12:00:00Z");
  it("último mês: os 30 dias antes da validade", () => {
    const mes = mesDoPlano(valida, d("2026-12-20T15:00:00Z"));
    expect(mes).toEqual({ inicio: new Date(valida.getTime() - 30 * DIA), fim: valida });
  });
  it("mês anterior quando a data cai antes dos últimos 30 dias", () => {
    const mes = mesDoPlano(valida, d("2026-11-25T15:00:00Z"));
    expect(mes).toEqual({ inicio: new Date(valida.getTime() - 60 * DIA), fim: new Date(valida.getTime() - 30 * DIA) });
  });
  it("início do mês pertence a ele; o fim já é do seguinte", () => {
    const inicioUltimo = new Date(valida.getTime() - 30 * DIA);
    expect(mesDoPlano(valida, inicioUltimo)?.fim).toEqual(valida);
  });
  it("depois da validade não há mês", () => {
    expect(mesDoPlano(valida, valida)).toBeNull();
  });
});

describe("motivoParaNaoUsarPlano", () => {
  const base = {
    situacao: "ATIVA" as const,
    validaAte: d("2026-12-31T12:00:00Z"),
    servicoNoPlano: true,
    inicio: d("2026-12-20T15:00:00Z"),
    usosPorMes: 4,
    usosNoMes: 3,
  };
  it("libera dentro das regras", () => {
    expect(motivoParaNaoUsarPlano(base)).toBeNull();
  });
  it("ilimitado não conta usos", () => {
    expect(motivoParaNaoUsarPlano({ ...base, usosPorMes: null, usosNoMes: 99 })).toBeNull();
  });
  it("bloqueia quando acabaram os usos do mês", () => {
    expect(motivoParaNaoUsarPlano({ ...base, usosNoMes: 4 })).toMatch(/4 atendimentos/);
  });
  it("bloqueia serviço fora do plano", () => {
    expect(motivoParaNaoUsarPlano({ ...base, servicoNoPlano: false })).toMatch(/não faz parte/);
  });
  it("bloqueia horário depois do vencimento", () => {
    expect(motivoParaNaoUsarPlano({ ...base, inicio: d("2027-01-02T15:00:00Z") })).toMatch(/vencimento/);
  });
  it("bloqueia vencida, cancelada e sem pagamento", () => {
    expect(motivoParaNaoUsarPlano({ ...base, situacao: "VENCIDA" })).toMatch(/venceu/);
    expect(motivoParaNaoUsarPlano({ ...base, situacao: "CANCELADA" })).toMatch(/cancelado/);
    expect(motivoParaNaoUsarPlano({ ...base, situacao: "AGUARDANDO_PAGAMENTO", validaAte: null })).toMatch(/primeiro mês/);
  });
});

describe("descreverUsos", () => {
  it("descreve ilimitado, singular e plural", () => {
    expect(descreverUsos(null)).toBe("Atendimentos ilimitados");
    expect(descreverUsos(1)).toBe("1 atendimento por mês");
    expect(descreverUsos(4)).toBe("4 atendimentos por mês");
  });
});
