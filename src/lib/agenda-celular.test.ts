import { describe, expect, it } from "vitest";
import { arquivoIcs, linkGoogleAgenda } from "./agenda-celular";

const evento = {
  id: "ag123",
  titulo: "Corte, barba; na Barbearia RIO",
  inicio: new Date("2026-11-26T13:00:00Z"),
  fim: new Date("2026-11-26T13:40:00Z"),
  local: "Rua A, 10",
  descricao: "Com Rafael\nRemarcar: https://x/meu-horario/abc",
};

describe("arquivoIcs", () => {
  const ics = arquivoIcs(evento, new Date("2026-11-25T10:00:00Z"));
  it("usa horários em UTC e linhas CRLF", () => {
    expect(ics).toContain("DTSTART:20261126T130000Z\r\n");
    expect(ics).toContain("DTEND:20261126T134000Z\r\n");
    expect(ics).toContain("DTSTAMP:20261125T100000Z\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("escapa vírgula, ponto e vírgula e quebra de linha", () => {
    expect(ics).toContain("SUMMARY:Corte\\, barba\\; na Barbearia RIO");
    expect(ics).toContain("DESCRIPTION:Com Rafael\\nRemarcar: https://x/meu-horario/abc");
    expect(ics).toContain("LOCATION:Rua A\\, 10");
  });
  it("sem local nem descrição, não inclui os campos", () => {
    const simples = arquivoIcs({ ...evento, local: null, descricao: null });
    expect(simples).not.toContain("LOCATION:");
    expect(simples.match(/DESCRIPTION:/g)).toHaveLength(1); // só o do alarme
  });
});

describe("linkGoogleAgenda", () => {
  it("monta o link com o intervalo e os textos", () => {
    const url = new URL(linkGoogleAgenda(evento));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("dates")).toBe("20261126T130000Z/20261126T134000Z");
    expect(url.searchParams.get("text")).toBe(evento.titulo);
    expect(url.searchParams.get("location")).toBe("Rua A, 10");
  });
});
