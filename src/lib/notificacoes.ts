import "server-only";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { inicioDoDiaBrasil } from "./fuso-brasil";
import { linkDoCliente, linkParaAgendar } from "./link-cliente";
import { whatsappLigado } from "./whatsapp-adicional";
import { capitalizar, formatarDataInstante, formatarHora, formatarMoeda, formatarTelefone, numeroWhatsApp } from "./formatar";
import { FUSO_PADRAO } from "./fusos";

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
  | "agendamento.lembrete" // lembrete pro cliente antes do horário (ver lib/lembretes)
  | "agendamento.cancelado_pelo_cliente" // o cliente cancelou pelo link da mensagem
  | "agendamento.remarcado_pelo_cliente" // o cliente mudou o horário pelo link da mensagem
  | "sinal.pago_sem_horario" // Pix pago depois do prazo, com o horário já ocupado: precisa devolver
  | "sinal.informado"; // cliente avisou que fez o Pix pela chave da barbearia: o dono confere

// Eventos em que o cliente também recebe mensagem (o lembrete sai por lib/lembretes).
type EventoCliente = Extract<
  EventoNotificacao,
  | "agendamento.confirmado"
  | "agendamento.remarcado"
  | "agendamento.lembrete"
  | "agendamento.cancelado_pelo_cliente"
  | "agendamento.remarcado_pelo_cliente"
>;

type Destinatario = "barbearia" | "cliente";

const TEMPO_LIMITE_MS = 5000;

export function notificacoesConfiguradas(): boolean {
  return Boolean(process.env.N8N_WEBHOOK_URL);
}

// Agenda os avisos pra depois da resposta. Chamar de dentro de uma rota.
// avisarBarbearia: false quando foi a própria equipe que marcou (painel) — aí
// só o cliente recebe a confirmação. anterior: o horário de antes, quando o
// cliente remarca (a barbearia precisa saber de onde ele saiu).
export function notificarAgendamento(
  evento: EventoNotificacao,
  agendamentoId: string,
  { avisarBarbearia = true, anterior }: { avisarBarbearia?: boolean; anterior?: Date } = {},
): void {
  if (!notificacoesConfiguradas()) return;
  after(async () => {
    try {
      await enviar(evento, agendamentoId, avisarBarbearia, anterior);
    } catch (erro) {
      console.error(`Notificação ${evento}:`, erro instanceof Error ? erro.message : erro);
    }
  });
}

// O que as mensagens precisam de um agendamento.
export const INCLUIR_NOTIFICACAO = {
  cliente: { select: { nome: true, telefone: true, aceitaMensagens: true } },
  servico: { select: { nome: true, preco: true } },
  barbeiro: { select: { nome: true } },
  assinatura: { select: { plano: { select: { nome: true } } } },
  barbearia: {
    select: {
      id: true,
      nome: true,
      slug: true,
      telefone: true,
      telefoneAvisos: true,
      fuso: true,
      whatsappAtivo: true,
      emTeste: true,
      acessoAte: true,
    },
  },
} satisfies Prisma.AgendamentoInclude;

export type AgendamentoNotificacao = Prisma.AgendamentoGetPayload<{ include: typeof INCLUIR_NOTIFICACAO }>;

// Cliente que pediu pra não receber (ou foi removido), ou sem DDD no
// telefone, fica sem mensagem: o envio nem acontece.
export function whatsappDoCliente(ag: AgendamentoNotificacao): string | null {
  return ag.cliente.aceitaMensagens ? numeroWhatsApp(ag.cliente.telefone) : null;
}

function porExtenso(instante: Date, fuso: string = FUSO_PADRAO): string {
  return `${capitalizar(formatarDataInstante(instante, { weekday: "long", day: "2-digit", month: "2-digit" }, fuso))} às ${formatarHora(instante, fuso)}`;
}

export function dadosDaMensagem(ag: AgendamentoNotificacao, anterior?: Date): DadosMensagem {
  return {
    quando: porExtenso(ag.inicio, ag.barbearia.fuso),
    quandoAnterior: anterior ? porExtenso(anterior, ag.barbearia.fuso) : null,
    linkCliente: linkDoCliente(ag.id),
    linkAgendar: linkParaAgendar(ag.barbearia.slug),
    cliente: ag.cliente.nome,
    telefone: formatarTelefone(ag.cliente.telefone),
    servico: ag.servico.nome,
    profissional: ag.barbeiro.nome,
    sinalPago: ag.sinalStatus === "PAGO" && ag.sinalValor !== null ? Number(ag.sinalValor) : null,
    sinalValor: ag.sinalValor !== null ? Number(ag.sinalValor) : null,
    plano: ag.assinatura?.plano.nome ?? null,
    barbearia: ag.barbearia.nome,
    telefoneBarbearia: ag.barbearia.telefone ? formatarTelefone(ag.barbearia.telefone) : null,
  };
}

// Campos comuns a todo POST pro webhook (o fluxo do n8n só usa `para` e
// `mensagem`; o resto fica pra quem quiser montar outra automação).
export function corpoDoWebhook(evento: EventoNotificacao, ag: AgendamentoNotificacao, dados: DadosMensagem) {
  return {
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
    cliente: { nome: dados.cliente, telefone: dados.telefone, whatsapp: whatsappDoCliente(ag) },
  };
}

async function enviar(
  evento: EventoNotificacao,
  agendamentoId: string,
  avisarBarbearia: boolean,
  anterior?: Date,
): Promise<void> {
  const ag = await prisma.agendamento.findUnique({ where: { id: agendamentoId }, include: INCLUIR_NOTIFICACAO });
  if (!ag) return;
  // Sem o adicional de WhatsApp (e fora do teste grátis), nenhuma mensagem sai.
  if (!whatsappLigado(ag.barbearia)) return;

  // Barbearia: o WhatsApp dos avisos ou, sem ele, o telefone da barbearia.
  const whatsappBarbearia = numeroWhatsApp(ag.barbearia.telefoneAvisos ?? ag.barbearia.telefone ?? "");
  const whatsappCliente = whatsappDoCliente(ag);
  const dados = dadosDaMensagem(ag, anterior);

  const envios: { destinatario: Destinatario; para: string; mensagem: string }[] = [];
  if (avisarBarbearia && whatsappBarbearia) {
    envios.push({ destinatario: "barbearia", para: whatsappBarbearia, mensagem: montarMensagem(evento, dados) });
  }
  // O cliente fica sabendo do horário marcado, mudado ou cancelado. O Pix
  // pago sem horário é a barbearia que resolve com ele, e o Pix pela chave o
  // dono confere antes (o cliente recebe a confirmação quando ele confirmar).
  const soBarbearia = evento === "sinal.pago_sem_horario" || evento === "sinal.informado" || evento === "agendamento.lembrete";
  if (!soBarbearia && whatsappCliente) {
    envios.push({ destinatario: "cliente", para: whatsappCliente, mensagem: montarMensagemCliente(dados, evento) });
  }

  const base = corpoDoWebhook(evento, ag, dados);

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

export interface DadosMensagem {
  quando: string;
  // Horário de antes, quando o cliente remarca.
  quandoAnterior?: string | null;
  cliente: string;
  telefone: string;
  servico: string;
  profissional: string;
  sinalPago: number | null;
  // Valor do sinal, pago ou não (o aviso do Pix pela chave precisa dele).
  sinalValor?: number | null;
  // Agendado pelo plano de corte do cliente (nome do plano).
  plano?: string | null;
  barbearia: string;
  telefoneBarbearia: string | null;
  // Página do cliente pra ver, mudar ou cancelar (null sem APP_URL).
  linkCliente?: string | null;
  // Página de agendamento da barbearia, pra marcar de novo.
  linkAgendar?: string | null;
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
  if (evento === "sinal.informado") {
    return [
      "💰 *Pix do sinal para conferir*",
      "",
      `*Cliente:* ${d.cliente} (${d.telefone})`,
      `*Valor:* ${d.sinalValor != null ? formatarMoeda(d.sinalValor) : "sinal"}`,
      `*Serviço:* ${d.servico} com ${d.profissional}`,
      `*Quando:* ${d.quando}`,
      "",
      "O cliente disse que fez o Pix para a sua chave. Confira no app do banco e, se o dinheiro entrou, toque em *Recebi o Pix* na agenda do Barbium. Até lá, o horário fica reservado.",
    ].join("\n");
  }
  const titulo = {
    "agendamento.confirmado": "✂️ *Novo agendamento*",
    "agendamento.remarcado": "🔁 *Agendamento remarcado*",
    "agendamento.lembrete": "⏰ *Lembrete enviado*",
    "agendamento.cancelado_pelo_cliente": "❌ *Cliente cancelou pelo link*",
    "agendamento.remarcado_pelo_cliente": "🔁 *Cliente remarcou pelo link*",
  }[evento];
  const cancelado = evento === "agendamento.cancelado_pelo_cliente";
  return [
    titulo,
    "",
    `*Cliente:* ${d.cliente}`,
    `*Telefone:* ${d.telefone}`,
    `*Serviço:* ${d.servico}`,
    `*Profissional:* ${d.profissional}`,
    ...(d.quandoAnterior ? [`*Antes:* ${d.quandoAnterior}`, `*Agora:* ${d.quando}`] : [`*Quando:* ${d.quando}`]),
    ...(d.plano ? [`*Plano:* ${d.plano}`] : []),
    ...(d.sinalPago !== null
      ? [
          cancelado
            ? `*Sinal pago:* ${formatarMoeda(d.sinalPago)} (continua no caixa; se devolver, registre no painel)`
            : `*Sinal pago:* ${formatarMoeda(d.sinalPago)}`,
        ]
      : []),
    ...(cancelado ? ["", "O horário já está livre na agenda."] : []),
  ].join("\n");
}

// "Hoje às 15:00" / "Amanhã às 09:00" no lembrete, que chega perto do horário.
// Mais longe que isso, a data por extenso de sempre.
export function quandoRelativo(inicio: Date, agora: Date, quandoPorExtenso: string, fuso: string = FUSO_PADRAO): string {
  const dias = Math.round(
    (inicioDoDiaBrasil(inicio, fuso).getTime() - inicioDoDiaBrasil(agora, fuso).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (dias === 0) return `Hoje às ${formatarHora(inicio, fuso)}`;
  if (dias === 1) return `Amanhã às ${formatarHora(inicio, fuso)}`;
  return quandoPorExtenso;
}

// Mensagem pro cliente: confirma o horário (novo, mudado, lembrete ou
// cancelado) e mostra o caminho pra mudar ou cancelar.
export function montarMensagemCliente(d: DadosMensagem, evento: EventoCliente = "agendamento.confirmado"): string {
  const primeiroNome = d.cliente.trim().split(/\s+/)[0];
  const rodape = ["", "_Não quer receber estas mensagens? É só avisar a barbearia._"];

  if (evento === "agendamento.cancelado_pelo_cliente") {
    return [
      `Olá, ${primeiroNome}.`,
      `Seu horário na *${d.barbearia}* foi cancelado, como você pediu.`,
      "",
      `*Era:* ${d.servico} com ${d.profissional}, ${d.quando}`,
      ...(d.sinalPago !== null
        ? ["", `Você pagou um sinal de ${formatarMoeda(d.sinalPago)}. Sobre a devolução, fale com a barbearia.`]
        : []),
      ...(d.linkAgendar ? ["", `Quer marcar outro horário? ${d.linkAgendar}`] : []),
      ...rodape,
    ].join("\n");
  }

  const remarcado = evento === "agendamento.remarcado" || evento === "agendamento.remarcado_pelo_cliente";
  const abertura =
    evento === "agendamento.lembrete"
      ? [`Olá, ${primeiroNome}! ⏰`, `Passando pra lembrar do seu horário na *${d.barbearia}*.`]
      : remarcado
        ? [`Olá, ${primeiroNome}! ✂️`, `Seu horário na *${d.barbearia}* mudou.`]
        : [`Olá, ${primeiroNome}! ✂️`, `Seu horário na *${d.barbearia}* está marcado.`];

  const comoMudar = d.linkCliente
    ? `Precisa remarcar ou cancelar? ${d.linkCliente}`
    : d.telefoneBarbearia
      ? `Precisa remarcar ou cancelar? Fale com a barbearia: ${d.telefoneBarbearia}`
      : "Precisa remarcar ou cancelar? Fale com a barbearia.";

  return [
    ...abertura,
    "",
    `*Serviço:* ${d.servico}`,
    `*Profissional:* ${d.profissional}`,
    `*${remarcado ? "Novo horário" : "Quando"}:* ${d.quando}`,
    ...(d.sinalPago !== null ? [`*Sinal pago:* ${formatarMoeda(d.sinalPago)}`] : []),
    "",
    comoMudar,
    ...rodape,
  ].join("\n");
}
