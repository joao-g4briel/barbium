import "server-only";
import { after } from "next/server";
import { prisma } from "./prisma";
import { capitalizar, formatarDataInstante, formatarHora, formatarMoeda, formatarTelefone, numeroWhatsApp } from "./formatar";

// Avisos automáticos por WhatsApp: pro dono (agendamento novo) e pro cliente
// (horário marcado). O Barbium só dispara um POST pro webhook configurado
// (hoje o n8n, que manda pela Evolution API), um por destinatário, com o
// número em `para` e o texto pronto em `mensagem`. O fluxo do lado de lá só
// repassa os dois.
//
// Sem N8N_WEBHOOK_URL, não faz nada. Falha no envio nunca atrapalha o
// agendamento: roda depois da resposta (after) e só registra no log.

export type EventoNotificacao =
  | "agendamento.confirmado" // agendamento novo (sem sinal, ou com o Pix pago)
  | "agendamento.remarcado" // a barbearia mudou o dia, o horário ou o profissional
  | "sinal.pago_sem_horario"; // Pix pago depois do prazo, com o horário já ocupado: precisa devolver

type Destinatario = "barbearia" | "cliente";

const TEMPO_LIMITE_MS = 5000;

export function notificacoesConfiguradas(): boolean {
  return Boolean(process.env.N8N_WEBHOOK_URL);
}

// Agenda os avisos pra depois da resposta. Chamar de dentro de uma rota.
// avisarBarbearia: false quando foi a própria equipe que marcou (painel) — aí
// só o cliente recebe a confirmação.
export function notificarAgendamento(
  evento: EventoNotificacao,
  agendamentoId: string,
  { avisarBarbearia = true }: { avisarBarbearia?: boolean } = {},
): void {
  if (!notificacoesConfiguradas()) return;
  after(async () => {
    try {
      await enviar(evento, agendamentoId, avisarBarbearia);
    } catch (erro) {
      console.error(`Notificação ${evento}:`, erro instanceof Error ? erro.message : erro);
    }
  });
}

async function enviar(evento: EventoNotificacao, agendamentoId: string, avisarBarbearia: boolean): Promise<void> {
  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      cliente: { select: { nome: true, telefone: true, aceitaMensagens: true } },
      servico: { select: { nome: true, preco: true } },
      barbeiro: { select: { nome: true } },
      barbearia: { select: { id: true, nome: true, slug: true, telefone: true, telefoneAvisos: true } },
    },
  });
  if (!ag) return;

  // Números no formato do WhatsApp. Sem DDD não há pra quem mandar, e aquele
  // envio nem acontece (o fluxo do n8n não precisa filtrar esse caso).
  // Barbearia: o WhatsApp dos avisos ou, sem ele, o telefone da barbearia.
  const whatsappBarbearia = numeroWhatsApp(ag.barbearia.telefoneAvisos ?? ag.barbearia.telefone ?? "");
  // Cliente que pediu pra não receber (ou foi removido) fica sem mensagem.
  const whatsappCliente = ag.cliente.aceitaMensagens ? numeroWhatsApp(ag.cliente.telefone) : null;

  const dados: DadosMensagem = {
    quando: `${capitalizar(formatarDataInstante(ag.inicio, { weekday: "long", day: "2-digit", month: "2-digit" }))} às ${formatarHora(ag.inicio)}`,
    cliente: ag.cliente.nome,
    telefone: formatarTelefone(ag.cliente.telefone),
    servico: ag.servico.nome,
    profissional: ag.barbeiro.nome,
    sinalPago: ag.sinalStatus === "PAGO" && ag.sinalValor !== null ? Number(ag.sinalValor) : null,
    barbearia: ag.barbearia.nome,
    telefoneBarbearia: ag.barbearia.telefone ? formatarTelefone(ag.barbearia.telefone) : null,
  };

  const envios: { destinatario: Destinatario; para: string; mensagem: string }[] = [];
  if (avisarBarbearia && whatsappBarbearia) {
    envios.push({ destinatario: "barbearia", para: whatsappBarbearia, mensagem: montarMensagem(evento, dados) });
  }
  // O cliente fica sabendo do horário marcado e do horário mudado. O Pix
  // pago sem horário é a barbearia que resolve com ele.
  if ((evento === "agendamento.confirmado" || evento === "agendamento.remarcado") && whatsappCliente) {
    envios.push({ destinatario: "cliente", para: whatsappCliente, mensagem: montarMensagemCliente(dados, evento) });
  }

  const base = {
    evento,
    barbearia: { id: ag.barbearia.id, nome: ag.barbearia.nome, slug: ag.barbearia.slug },
    agendamento: {
      id: ag.id,
      inicio: ag.inicio.toISOString(),
      quando: dados.quando,
      servico: dados.servico,
      preco: Number(ag.servico.preco),
      profissional: dados.profissional,
      sinalPago: dados.sinalPago,
    },
    cliente: { nome: dados.cliente, telefone: dados.telefone, whatsapp: whatsappCliente },
  };

  // Um destinatário com problema não impede o outro de receber.
  const resultados = await Promise.allSettled(
    envios.map((envio) =>
      postarWebhook({
        ...base,
        ...envio,
        // Compatibilidade com fluxos antigos, que mandavam pra barbearia.whatsapp:
        // só o envio da barbearia preenche, pra mensagem do cliente nunca ir
        // parar no dono. Fluxos novos usam `para`.
        barbearia: { ...base.barbearia, whatsapp: envio.destinatario === "barbearia" ? envio.para : null },
      }),
    ),
  );
  const falhas = resultados.flatMap((r, i) =>
    r.status === "rejected" ? [`${envios[i].destinatario}: ${r.reason instanceof Error ? r.reason.message : r.reason}`] : [],
  );
  if (falhas.length) throw new Error(falhas.join("; "));
}

export async function postarWebhook(corpo: unknown): Promise<void> {
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

interface DadosMensagem {
  quando: string;
  cliente: string;
  telefone: string;
  servico: string;
  profissional: string;
  sinalPago: number | null;
  barbearia: string;
  telefoneBarbearia: string | null;
}

// Mensagem pro dono.
export function montarMensagem(evento: EventoNotificacao, d: DadosMensagem): string {
  if (evento === "sinal.pago_sem_horario") {
    return [
      "⚠️ *Sinal pago sem horário*",
      "",
      `${d.cliente} (${d.telefone}) pagou o Pix de ${d.sinalPago !== null ? formatarMoeda(d.sinalPago) : "sinal"} depois do prazo, e o horário de ${d.quando} já foi ocupado.`,
      "Combine um novo horário ou devolva o sinal pelo Mercado Pago.",
    ].join("\n");
  }
  return [
    evento === "agendamento.remarcado" ? "🔁 *Agendamento remarcado*" : "✂️ *Novo agendamento*",
    "",
    `*Cliente:* ${d.cliente}`,
    `*Telefone:* ${d.telefone}`,
    `*Serviço:* ${d.servico}`,
    `*Profissional:* ${d.profissional}`,
    `*Quando:* ${d.quando}`,
    ...(d.sinalPago !== null ? [`*Sinal pago:* ${formatarMoeda(d.sinalPago)}`] : []),
  ].join("\n");
}

// Mensagem pro cliente: confirma o horário (novo ou mudado) e diz com quem
// falar pra mudar.
export function montarMensagemCliente(
  d: DadosMensagem,
  evento: "agendamento.confirmado" | "agendamento.remarcado" = "agendamento.confirmado",
): string {
  const primeiroNome = d.cliente.trim().split(/\s+/)[0];
  const remarcado = evento === "agendamento.remarcado";
  return [
    `Olá, ${primeiroNome}! ✂️`,
    remarcado ? `Seu horário na *${d.barbearia}* mudou.` : `Seu horário na *${d.barbearia}* está marcado.`,
    "",
    `*Serviço:* ${d.servico}`,
    `*Profissional:* ${d.profissional}`,
    `*${remarcado ? "Novo horário" : "Quando"}:* ${d.quando}`,
    ...(d.sinalPago !== null ? [`*Sinal pago:* ${formatarMoeda(d.sinalPago)}`] : []),
    "",
    d.telefoneBarbearia
      ? `Precisa remarcar ou cancelar? Fale com a barbearia: ${d.telefoneBarbearia}`
      : "Precisa remarcar ou cancelar? Fale com a barbearia.",
    "",
    "_Não quer receber estas mensagens? É só avisar a barbearia._",
  ].join("\n");
}
