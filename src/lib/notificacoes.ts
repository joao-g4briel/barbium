import "server-only";
import { after } from "next/server";
import { prisma } from "./prisma";
import { capitalizar, formatarDataInstante, formatarHora, formatarMoeda, formatarTelefone, numeroWhatsApp } from "./formatar";

// Avisos automáticos pra barbearia (ex.: WhatsApp do dono a cada agendamento
// novo). O Barbium só dispara um POST pro webhook configurado (hoje o n8n,
// que manda a mensagem pela Evolution API) com os dados e um texto pronto.
// Quem decide pra quem e como mandar é o fluxo do lado de lá.
//
// Sem N8N_WEBHOOK_URL, não faz nada. Falha no envio nunca atrapalha o
// agendamento: roda depois da resposta (after) e só registra no log.

export type EventoNotificacao =
  | "agendamento.confirmado" // agendamento novo pelo link público (sem sinal, ou com o Pix pago)
  | "sinal.pago_sem_horario"; // Pix pago depois do prazo, com o horário já ocupado: precisa devolver

const TEMPO_LIMITE_MS = 5000;

export function notificacoesConfiguradas(): boolean {
  return Boolean(process.env.N8N_WEBHOOK_URL);
}

// Agenda o aviso pra depois da resposta. Chamar de dentro de uma rota.
export function notificarAgendamento(evento: EventoNotificacao, agendamentoId: string): void {
  if (!notificacoesConfiguradas()) return;
  after(async () => {
    try {
      await enviar(evento, agendamentoId);
    } catch (erro) {
      console.error(`Notificação ${evento}:`, erro instanceof Error ? erro.message : erro);
    }
  });
}

async function enviar(evento: EventoNotificacao, agendamentoId: string): Promise<void> {
  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      servico: { select: { nome: true, preco: true } },
      barbeiro: { select: { nome: true } },
      barbearia: { select: { id: true, nome: true, slug: true, telefone: true } },
    },
  });
  if (!ag) return;

  const quando = `${capitalizar(formatarDataInstante(ag.inicio, { weekday: "long", day: "2-digit", month: "2-digit" }))} às ${formatarHora(ag.inicio)}`;
  const sinalPago = ag.sinalStatus === "PAGO" && ag.sinalValor !== null ? Number(ag.sinalValor) : null;

  const corpo = {
    evento,
    barbearia: {
      id: ag.barbearia.id,
      nome: ag.barbearia.nome,
      slug: ag.barbearia.slug,
      // Destino do aviso. null quando a barbearia não cadastrou telefone com
      // DDD em Configurações: o fluxo deve ignorar o evento.
      whatsapp: ag.barbearia.telefone ? numeroWhatsApp(ag.barbearia.telefone) : null,
    },
    agendamento: {
      id: ag.id,
      inicio: ag.inicio.toISOString(),
      quando,
      servico: ag.servico.nome,
      preco: Number(ag.servico.preco),
      profissional: ag.barbeiro.nome,
      sinalPago,
    },
    cliente: {
      nome: ag.cliente.nome,
      telefone: formatarTelefone(ag.cliente.telefone),
      whatsapp: numeroWhatsApp(ag.cliente.telefone),
    },
    mensagem: montarMensagem(evento, {
      quando,
      cliente: ag.cliente.nome,
      telefone: formatarTelefone(ag.cliente.telefone),
      servico: ag.servico.nome,
      profissional: ag.barbeiro.nome,
      sinalPago,
    }),
  };

  const resposta = await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.N8N_WEBHOOK_TOKEN ? { "x-barbium-token": process.env.N8N_WEBHOOK_TOKEN } : {}),
    },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });
  if (!resposta.ok) throw new Error(`webhook respondeu ${resposta.status}`);
}

export function montarMensagem(
  evento: EventoNotificacao,
  d: { quando: string; cliente: string; telefone: string; servico: string; profissional: string; sinalPago: number | null },
): string {
  if (evento === "sinal.pago_sem_horario") {
    return [
      "⚠️ *Sinal pago sem horário*",
      "",
      `${d.cliente} (${d.telefone}) pagou o Pix de ${d.sinalPago !== null ? formatarMoeda(d.sinalPago) : "sinal"} depois do prazo, e o horário de ${d.quando} já foi ocupado.`,
      "Combine um novo horário ou devolva o sinal pelo Mercado Pago.",
    ].join("\n");
  }
  return [
    "✂️ *Novo agendamento*",
    "",
    `*Cliente:* ${d.cliente}`,
    `*Telefone:* ${d.telefone}`,
    `*Serviço:* ${d.servico}`,
    `*Profissional:* ${d.profissional}`,
    `*Quando:* ${d.quando}`,
    ...(d.sinalPago !== null ? [`*Sinal pago:* ${formatarMoeda(d.sinalPago)}`] : []),
  ].join("\n");
}
