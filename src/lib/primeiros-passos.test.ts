import { describe, expect, it } from "vitest";
import type { DiaSemana } from "@prisma/client";
import { expedientePersonalizado, montarPassos } from "./primeiros-passos";

const UTEIS: DiaSemana[] = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];
const padrao = () => [
  { diaSemana: "DOMINGO" as DiaSemana, atende: false, horaInicio: "09:00", horaFim: "19:00", almocoInicio: null, almocoFim: null },
  ...UTEIS.map((diaSemana) => ({ diaSemana, atende: true, horaInicio: "09:00", horaFim: "19:00", almocoInicio: null, almocoFim: null })),
];

describe("primeiros passos", () => {
  it("o expediente criado no cadastro não conta como ajustado", () => {
    expect(expedientePersonalizado(padrao())).toBe(false);
    expect(expedientePersonalizado([])).toBe(false);
  });

  it("qualquer mudança nos horários conta como ajustado", () => {
    const comAlmoco = padrao().map((d) => (d.diaSemana === "SEGUNDA" ? { ...d, almocoInicio: "12:00", almocoFim: "13:00" } : d));
    const sabadoMenor = padrao().map((d) => (d.diaSemana === "SABADO" ? { ...d, horaFim: "14:00" } : d));
    const domingoAberto = padrao().map((d) => (d.diaSemana === "DOMINGO" ? { ...d, atende: true } : d));
    expect(expedientePersonalizado(comAlmoco)).toBe(true);
    expect(expedientePersonalizado(sabadoMenor)).toBe(true);
    expect(expedientePersonalizado(domingoAberto)).toBe(true);
  });

  it("barbearia recém-criada no plano Solo, sem WhatsApp: serviços, horários e link pendentes", () => {
    const passos = montarPassos({
      servicosAtivos: 0,
      expediente: padrao(),
      profissionaisAtivos: 1,
      plano: "SOLO",
      lembreteAtivo: false,
      whatsappLigado: false,
      agendamentos: 0,
    });
    expect(passos.map((p) => p.id)).toEqual(["servicos", "horarios", "link"]);
    expect(passos.every((p) => !p.feito)).toBe(true);
  });

  it("plano com equipe e WhatsApp ligado mostra os passos extras e conclui pelos dados", () => {
    const passos = montarPassos({
      servicosAtivos: 3,
      expediente: padrao(),
      profissionaisAtivos: 2,
      plano: "BARBEARIA",
      lembreteAtivo: true,
      whatsappLigado: true,
      agendamentos: 1,
    });
    expect(passos.map((p) => p.id)).toEqual(["servicos", "horarios", "equipe", "lembrete", "link"]);
    // O primeiro agendamento mostra que os horários já estão servindo.
    expect(passos.every((p) => p.feito)).toBe(true);
  });
});
