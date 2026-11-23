import "server-only";
import { consumirTentativa } from "./limite-tentativas";
import { formatarDataInstante, formatarHora, numeroWhatsApp } from "./formatar";
import { notificacoesConfiguradas, postarWebhook } from "./notificacoes";

// Erro no servidor vira mensagem no WhatsApp de quem opera a plataforma
// (PLATAFORMA_WHATSAPP), pelo mesmo webhook do n8n das notificações. Chamado
// pelo onRequestError (src/instrumentation.ts).
//
// O mesmo erro na mesma rota avisa uma vez a cada 30 minutos: uma página
// quebrada recebendo visitas não pode virar uma enxurrada de mensagens.

const INTERVALO_SEGUNDOS = 30 * 60;
const TAMANHO_MAXIMO = 300;

// Plano B da contagem quando o banco está fora (aí todo pedido falha, e é
// justamente quando a enxurrada aconteceria). Vale só dentro desta instância.
const ultimosAvisos = new Map<string, number>();

// Identifica "o mesmo erro na mesma rota" (FNV-1a, 32 bits). Não precisa ser
// criptográfico: só agrupa avisos repetidos.
function assinaturaDe(texto: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

async function podeAvisar(chave: string): Promise<boolean> {
  try {
    return await consumirTentativa(chave, 1, INTERVALO_SEGUNDOS);
  } catch {
    const agora = Date.now();
    const ultimo = ultimosAvisos.get(chave);
    if (ultimo && agora - ultimo < INTERVALO_SEGUNDOS * 1000) return false;
    ultimosAvisos.set(chave, agora);
    return true;
  }
}

export async function alertarErro(erro: unknown, onde: string, digest?: string): Promise<void> {
  const para = numeroWhatsApp(process.env.PLATAFORMA_WHATSAPP ?? "");
  if (!notificacoesConfiguradas() || !para) return;

  const texto = erro instanceof Error ? erro.message : String(erro);
  if (!(await podeAvisar(`alerta-erro:${assinaturaDe(`${onde}\n${texto}`)}`))) return;

  const agora = new Date();
  const mensagem = [
    "🚨 *Erro no Barbium*",
    "",
    `*Onde:* ${onde}`,
    `*Erro:* ${texto.length > TAMANHO_MAXIMO ? `${texto.slice(0, TAMANHO_MAXIMO)}…` : texto}`,
    `*Quando:* ${formatarDataInstante(agora, { day: "2-digit", month: "2-digit" })} às ${formatarHora(agora)}`,
    "",
    `Detalhes nos logs da Vercel${digest ? ` (digest ${digest})` : ""}. Novos avisos deste mesmo erro só daqui a 30 min.`,
  ].join("\n");

  await postarWebhook({ evento: "erro.servidor", destinatario: "plataforma", para, mensagem });
}
