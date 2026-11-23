import "server-only";
import type { DiaSemana, SinalStatus, StatusAgendamento } from "@prisma/client";
import { prisma } from "./prisma";
import { horarioBrasil, inicioDoDiaBrasil } from "./fuso-brasil";

// Indicadores da barbearia num período: ticket médio, faltas, cancelamentos e
// ocupação da agenda, no geral e por profissional. O período conta pela data
// do atendimento (não pela data em que foi marcado).

const DIAS_SEMANA: DiaSemana[] = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];
const DIA_MS = 24 * 60 * 60 * 1000;

interface Intervalo {
  inicio: number;
  fim: number;
}

export interface DiaExpediente {
  diaSemana: DiaSemana;
  atende: boolean;
  horaInicio: string;
  horaFim: string;
  almocoInicio: string | null;
  almocoFim: string | null;
}

export interface AgendamentoIndicador {
  profissionalId: string;
  status: StatusAgendamento;
  sinalStatus: SinalStatus | null;
  inicio: Date;
  fim: Date;
  // O que entrou no caixa por esse atendimento (sinal + restante).
  recebido: number;
}

export interface Indicadores {
  concluidos: number;
  faltas: number;
  cancelados: number;
  agendados: number;
  faturamento: number;
  // null quando não há base pra calcular (ex.: nenhum concluído).
  ticketMedio: number | null;
  taxaFaltas: number | null;
  taxaCancelamento: number | null;
  ocupacao: number | null;
  minutosOcupados: number;
  minutosCapacidade: number;
}

function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

function sobreposicao(a: Intervalo, b: Intervalo): number {
  return Math.max(0, Math.min(a.fim, b.fim) - Math.max(a.inicio, b.inicio));
}

// Junta bloqueios que se sobrepõem, pra não descontar o mesmo trecho duas vezes.
function juntar(intervalos: Intervalo[]): Intervalo[] {
  const ordenados = [...intervalos].sort((x, y) => x.inicio - y.inicio);
  const juntos: Intervalo[] = [];
  for (const i of ordenados) {
    const ultimo = juntos.at(-1);
    if (ultimo && i.inicio <= ultimo.fim) ultimo.fim = Math.max(ultimo.fim, i.fim);
    else juntos.push({ ...i });
  }
  return juntos;
}

// Minutos de expediente de um profissional entre `de` e `ate`: cada dia em
// que ele atende, menos o almoço e menos folgas/férias (bloqueios). Bloqueio
// sem fim (a trava de emergência) vale até o fim do período.
export function capacidadeEmMinutos(
  expediente: DiaExpediente[],
  bloqueios: { inicio: Date; fim: Date | null }[],
  de: Date,
  ate: Date,
): number {
  const periodo = { inicio: de.getTime(), fim: ate.getTime() };
  const bloqueado = juntar(
    bloqueios.map((b) => ({ inicio: b.inicio.getTime(), fim: b.fim ? b.fim.getTime() : periodo.fim })),
  );
  const porDia = new Map(expediente.map((d) => [d.diaSemana, d]));

  let total = 0;
  for (let dia = inicioDoDiaBrasil(de); dia.getTime() <= ate.getTime(); dia = new Date(dia.getTime() + DIA_MS)) {
    const exp = porDia.get(DIAS_SEMANA[dia.getUTCDay()]);
    if (!exp || !exp.atende) continue;

    const abre = horarioBrasil(dia, minutos(exp.horaInicio)).getTime();
    const fecha = horarioBrasil(dia, minutos(exp.horaFim)).getTime();
    const janelas: Intervalo[] =
      exp.almocoInicio && exp.almocoFim
        ? [
            { inicio: abre, fim: horarioBrasil(dia, minutos(exp.almocoInicio)).getTime() },
            { inicio: horarioBrasil(dia, minutos(exp.almocoFim)).getTime(), fim: fecha },
          ]
        : [{ inicio: abre, fim: fecha }];

    for (const janela of janelas) {
      const dentro = { inicio: Math.max(janela.inicio, periodo.inicio), fim: Math.min(janela.fim, periodo.fim) };
      if (dentro.fim <= dentro.inicio) continue;
      const livre = dentro.fim - dentro.inicio - bloqueado.reduce((s, b) => s + sobreposicao(dentro, b), 0);
      total += Math.max(0, livre);
    }
  }
  return Math.round(total / 60000);
}

// Pix de sinal que expirou sem pagamento vira CANCELADO com o sinal ainda
// PENDENTE: não é cancelamento do cliente, é reserva que não se confirmou.
function ehPixExpirado(a: AgendamentoIndicador): boolean {
  return a.status === "CANCELADO" && a.sinalStatus === "PENDENTE";
}

const centavos = (v: number) => Math.round(v * 100) / 100;

export function calcularIndicadores(
  agendamentos: AgendamentoIndicador[],
  minutosCapacidade: number,
  periodo: { inicio: Date; fim: Date },
): Indicadores {
  const validos = agendamentos.filter((a) => !ehPixExpirado(a));
  const concluidos = validos.filter((a) => a.status === "CONCLUIDO");
  const faltas = validos.filter((a) => a.status === "FALTA").length;
  const cancelados = validos.filter((a) => a.status === "CANCELADO").length;
  const faturamento = centavos(concluidos.reduce((s, a) => s + a.recebido, 0));

  const janela = { inicio: periodo.inicio.getTime(), fim: periodo.fim.getTime() };
  const minutosOcupados = Math.round(
    validos
      .filter((a) => a.status !== "CANCELADO")
      .reduce((s, a) => s + sobreposicao({ inicio: a.inicio.getTime(), fim: a.fim.getTime() }, janela), 0) / 60000,
  );

  const finalizados = concluidos.length + faltas;
  return {
    concluidos: concluidos.length,
    faltas,
    cancelados,
    agendados: validos.length,
    faturamento,
    ticketMedio: concluidos.length > 0 ? centavos(faturamento / concluidos.length) : null,
    taxaFaltas: finalizados > 0 ? faltas / finalizados : null,
    taxaCancelamento: validos.length > 0 ? cancelados / validos.length : null,
    ocupacao: minutosCapacidade > 0 ? Math.min(1, minutosOcupados / minutosCapacidade) : null,
    minutosOcupados,
    minutosCapacidade,
  };
}

export interface IndicadoresDaBarbearia {
  geral: Indicadores;
  porProfissional: (Indicadores & { id: string; nome: string; ativo: boolean })[];
}

export async function obterIndicadores(
  barbeariaId: string,
  periodo: { inicio: Date; fim: Date },
): Promise<IndicadoresDaBarbearia> {
  const [profissionais, agendamentos] = await Promise.all([
    prisma.usuario.findMany({
      where: { barbeariaId, role: { in: ["DONO", "BARBEIRO"] } },
      select: {
        id: true,
        nome: true,
        ativo: true,
        expediente: true,
        bloqueios: {
          where: { inicio: { lt: periodo.fim }, OR: [{ fim: null }, { fim: { gt: periodo.inicio } }] },
          select: { inicio: true, fim: true },
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.agendamento.findMany({
      where: { barbeariaId, inicio: { gte: periodo.inicio, lte: periodo.fim } },
      select: {
        barbeiroId: true,
        status: true,
        sinalStatus: true,
        inicio: true,
        fim: true,
        caixaLancamentos: { select: { valor: true } },
      },
    }),
  ]);

  const lista: AgendamentoIndicador[] = agendamentos.map((a) => ({
    profissionalId: a.barbeiroId,
    status: a.status,
    sinalStatus: a.sinalStatus,
    inicio: a.inicio,
    fim: a.fim,
    recebido: a.caixaLancamentos.reduce((s, l) => s + Number(l.valor), 0),
  }));

  const porProfissional = profissionais
    .map((p) => {
      // Inativo não tem agenda a ocupar: entra só se teve atendimento no período.
      const capacidade = p.ativo ? capacidadeEmMinutos(p.expediente, p.bloqueios, periodo.inicio, periodo.fim) : 0;
      const doProfissional = lista.filter((a) => a.profissionalId === p.id);
      return { id: p.id, nome: p.nome, ativo: p.ativo, ...calcularIndicadores(doProfissional, capacidade, periodo) };
    })
    .filter((p) => p.ativo || p.agendados > 0);

  const capacidadeTotal = porProfissional.reduce((s, p) => s + p.minutosCapacidade, 0);
  return { geral: calcularIndicadores(lista, capacidadeTotal, periodo), porProfissional };
}
