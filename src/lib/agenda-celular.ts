// "Adicionar à agenda" depois de agendar: um arquivo .ics (iPhone, Outlook e
// a maioria dos apps de agenda) e o link do Google Agenda.

export interface EventoAgenda {
  id: string;
  titulo: string;
  inicio: Date;
  fim: Date;
  local?: string | null;
  descricao?: string | null;
}

// 2026-11-26T13:00:00.000Z → 20261126T130000Z
function instanteUtc(data: Date): string {
  return data.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Texto de campo do iCalendar: escapa \ ; , e quebras de linha.
function textoIcs(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function arquivoIcs(evento: EventoAgenda, agora: Date = new Date()): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barbium//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evento.id}@barbium`,
    `DTSTAMP:${instanteUtc(agora)}`,
    `DTSTART:${instanteUtc(evento.inicio)}`,
    `DTEND:${instanteUtc(evento.fim)}`,
    `SUMMARY:${textoIcs(evento.titulo)}`,
    ...(evento.local ? [`LOCATION:${textoIcs(evento.local)}`] : []),
    ...(evento.descricao ? [`DESCRIPTION:${textoIcs(evento.descricao)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${textoIcs(evento.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.join("\r\n") + "\r\n";
}

export function linkArquivoIcs(evento: EventoAgenda): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(arquivoIcs(evento))}`;
}

export function linkGoogleAgenda(evento: EventoAgenda): string {
  const parametros = new URLSearchParams({
    action: "TEMPLATE",
    text: evento.titulo,
    dates: `${instanteUtc(evento.inicio)}/${instanteUtc(evento.fim)}`,
  });
  if (evento.local) parametros.set("location", evento.local);
  if (evento.descricao) parametros.set("details", evento.descricao);
  return `https://calendar.google.com/calendar/render?${parametros.toString()}`;
}
