import { FUSO_BRASIL } from "./fuso-brasil";

// Dois tipos de data circulam no app e não podem ser formatados do mesmo
// jeito (ver fuso-brasil.ts):
// - instantes reais (horário de um agendamento, criadoEm de um lançamento):
//   formatar no fuso de Brasília;
// - dias de calendário (meia-noite UTC que já representa "esse dia"):
//   formatar em UTC, sem converter de novo.

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarHora(instante: Date): string {
  return instante.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_BRASIL,
  });
}

export function formatarDataInstante(
  instante: Date,
  opcoes: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
): string {
  return instante.toLocaleDateString("pt-BR", { ...opcoes, timeZone: FUSO_BRASIL });
}

export function formatarDiaCalendario(
  dia: Date,
  opcoes: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
): string {
  return dia.toLocaleDateString("pt-BR", { ...opcoes, timeZone: "UTC" });
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

// "em 32 min", "em 1h 2min", "agora"
export function formatarTempoAte(minutos: number): string {
  if (minutos <= 0) return "agora";
  return `em ${formatarDuracao(Math.round(minutos))}`;
}

export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

// Telefones são guardados só com dígitos (ver as rotas de cliente), mas
// clientes antigos podem ter sido salvos formatados — normaliza antes.
export function formatarTelefone(telefone: string): string {
  const d = apenasDigitos(telefone);
  const local = d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return telefone;
}

// Link wa.me só faz sentido com DDD (10 ou 11 dígitos); sem isso, não
// oferece a ação em vez de abrir uma conversa com o número errado.
export function linkWhatsApp(telefone: string): string | null {
  const d = apenasDigitos(telefone);
  if (d.length === 10 || d.length === 11) return `https://wa.me/55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return `https://wa.me/${d}`;
  return null;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export const ROTULO_PAPEL: Record<"SUPER_ADMIN" | "DONO" | "BARBEIRO", string> = {
  SUPER_ADMIN: "Admin da plataforma",
  DONO: "Dono",
  BARBEIRO: "Profissional",
};
