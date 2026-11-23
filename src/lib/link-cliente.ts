import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Link que o cliente recebe no WhatsApp pra ver, mudar ou cancelar o próprio
// horário, sem login: /meu-horario/<id do agendamento>.<assinatura>.
// A assinatura (HMAC com o JWT_SECRET) é o que impede alguém de chegar no
// agendamento de outra pessoa trocando o id. Não precisa de coluna no banco e
// vale pra agendamentos antigos também.

const TAMANHO_ASSINATURA = 22; // 132 bits em base64url

// Prazo pra mudar ou cancelar pelo link. Mais perto que isso, a barbearia
// precisa ficar sabendo por conversa.
export const ANTECEDENCIA_LINK_HORAS = 2;

function segredo(): string {
  const valor = process.env.JWT_SECRET;
  if (!valor) throw new Error("JWT_SECRET não configurado.");
  return valor;
}

function assinar(agendamentoId: string): string {
  return createHmac("sha256", segredo())
    .update(`meu-horario:${agendamentoId}`)
    .digest("base64url")
    .slice(0, TAMANHO_ASSINATURA);
}

export function codigoDoAgendamento(agendamentoId: string): string {
  return `${agendamentoId}.${assinar(agendamentoId)}`;
}

// Devolve o id do agendamento se o código é legítimo, ou null.
export function agendamentoDoCodigo(codigo: string): string | null {
  const [id, assinatura, ...resto] = codigo.split(".");
  if (!id || !assinatura || resto.length > 0 || !/^[a-z0-9]{10,40}$/.test(id)) return null;
  const esperada = Buffer.from(assinar(id));
  const recebida = Buffer.from(assinatura);
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida) ? id : null;
}

// Endereço público do app pros links das mensagens. Nunca vem do cabeçalho
// Host (que pode ser forjado): APP_URL, ou o domínio que a própria Vercel
// informa pro ambiente.
export function urlPublicaDoApp(): string | null {
  const configurada = process.env.APP_URL?.replace(/\/+$/, "");
  if (configurada) return configurada;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

export function linkDoCliente(agendamentoId: string): string | null {
  const base = urlPublicaDoApp();
  return base ? `${base}/meu-horario/${codigoDoAgendamento(agendamentoId)}` : null;
}

export function linkParaAgendar(slug: string): string | null {
  const base = urlPublicaDoApp();
  return base ? `${base}/agendar/${slug}` : null;
}

// Ainda dá pra mudar ou cancelar pelo link?
export function podeAlterarPeloLink(ag: { status: string; inicio: Date }, agora = new Date()): boolean {
  return (
    ag.status === "CONFIRMADO" && ag.inicio.getTime() - agora.getTime() >= ANTECEDENCIA_LINK_HORAS * 60 * 60 * 1000
  );
}
