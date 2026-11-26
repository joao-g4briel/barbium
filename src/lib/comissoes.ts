import "server-only";
import { prisma } from "./prisma";
import { calcularComissao } from "./forma-pagamento";
import { horarioBrasil, inicioDoMesBrasil } from "./fuso-brasil";

// Comissões a partir dos atendimentos concluídos. A comissão de cada um foi
// calculada e guardada na conclusão (ver caixa-agendamento): mudar o
// percentual depois não altera o que já foi fechado.

export interface AtendimentoComissao {
  id: string;
  inicio: Date;
  cliente: string;
  servico: string;
  profissionalId: string;
  profissionalNome: string;
  // O que entrou no caixa por esse atendimento (sinal + restante).
  recebido: number;
  // null: nem o profissional nem o serviço tinham percentual na conclusão.
  percentual: number | null;
  comissao: number | null;
}

export interface ResumoProfissional {
  id: string;
  nome: string;
  atendimentos: number;
  semPercentual: number;
  faturamento: number;
  comissao: number;
}

// Atendimentos concluídos no período (pela data do atendimento), do mais
// recente pro mais antigo. Com profissionalId, só os dele.
export async function atendimentosComComissao(
  barbeariaId: string,
  { inicio, fim, profissionalId }: { inicio: Date; fim: Date; profissionalId?: string },
): Promise<AtendimentoComissao[]> {
  const concluidos = await prisma.agendamento.findMany({
    where: {
      barbeariaId,
      status: "CONCLUIDO",
      inicio: { gte: inicio, lte: fim },
      ...(profissionalId ? { barbeiroId: profissionalId } : {}),
    },
    orderBy: { inicio: "desc" },
    select: {
      id: true,
      inicio: true,
      comissaoPercentual: true,
      comissaoValor: true,
      cliente: { select: { nome: true } },
      servico: { select: { nome: true } },
      barbeiro: { select: { id: true, nome: true } },
      caixaLancamentos: { select: { valor: true } },
    },
  });

  return concluidos.map((a) => ({
    id: a.id,
    inicio: a.inicio,
    cliente: a.cliente.nome,
    servico: a.servico.nome,
    profissionalId: a.barbeiro.id,
    profissionalNome: a.barbeiro.nome,
    recebido: centavos(a.caixaLancamentos.reduce((s, l) => s + Number(l.valor), 0)),
    percentual: a.comissaoPercentual === null ? null : Number(a.comissaoPercentual),
    comissao: a.comissaoValor === null ? null : Number(a.comissaoValor),
  }));
}

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function resumirPorProfissional(atendimentos: AtendimentoComissao[]): ResumoProfissional[] {
  const porProfissional = new Map<string, ResumoProfissional>();
  for (const a of atendimentos) {
    const linha = porProfissional.get(a.profissionalId) ?? {
      id: a.profissionalId,
      nome: a.profissionalNome,
      atendimentos: 0,
      semPercentual: 0,
      faturamento: 0,
      comissao: 0,
    };
    linha.atendimentos += 1;
    linha.faturamento = centavos(linha.faturamento + a.recebido);
    if (a.comissao === null) linha.semPercentual += 1;
    else linha.comissao = centavos(linha.comissao + a.comissao);
    porProfissional.set(a.profissionalId, linha);
  }
  return [...porProfissional.values()].sort((x, y) => y.comissao - x.comissao || x.nome.localeCompare(y.nome));
}

export function totalizar(atendimentos: AtendimentoComissao[]) {
  return {
    atendimentos: atendimentos.length,
    faturamento: centavos(atendimentos.reduce((s, a) => s + a.recebido, 0)),
    comissao: centavos(atendimentos.reduce((s, a) => s + (a.comissao ?? 0), 0)),
    semPercentual: atendimentos.filter((a) => a.comissao === null).length,
  };
}

// Comissão do profissional no mês corrente (no fuso da barbearia): o que já
// ganhou (atendimentos concluídos, valor guardado na conclusão) e o que está
// previsto pelos horários ainda em aberto no mês. A previsão usa a mesma regra
// da conclusão (percentual do profissional, senão do serviço; no plano de
// corte, o valor fixo do plano); é estimativa, pode mudar até concluir.
export async function comissaoDoMes(
  barbeariaId: string,
  profissionalId: string,
  fuso: string,
  agora: Date = new Date(),
): Promise<{ ganha: number; prevista: number; concluidos: number; emAberto: number }> {
  const primeiroDia = inicioDoMesBrasil(agora, fuso);
  const inicio = horarioBrasil(primeiroDia, 0, fuso);
  const proximoMes = new Date(Date.UTC(primeiroDia.getUTCFullYear(), primeiroDia.getUTCMonth() + 1, 1));
  const fim = new Date(horarioBrasil(proximoMes, 0, fuso).getTime() - 1);

  const [concluidos, abertos] = await Promise.all([
    prisma.agendamento.aggregate({
      where: { barbeariaId, barbeiroId: profissionalId, status: "CONCLUIDO", inicio: { gte: inicio, lte: fim } },
      _sum: { comissaoValor: true },
      _count: true,
    }),
    prisma.agendamento.findMany({
      where: {
        barbeariaId,
        barbeiroId: profissionalId,
        status: { in: ["CONFIRMADO", "CHEGOU", "EM_ATENDIMENTO"] },
        inicio: { gte: inicio, lte: fim },
      },
      select: {
        servico: { select: { preco: true, comissaoPercentual: true } },
        barbeiro: { select: { comissaoPercentual: true } },
        assinatura: { select: { plano: { select: { comissaoValor: true } } } },
      },
    }),
  ]);

  const prevista = abertos.reduce((soma, a) => {
    if (a.assinatura) return soma + Number(a.assinatura.plano.comissaoValor);
    const c = calcularComissao(
      Number(a.servico.preco),
      a.barbeiro.comissaoPercentual === null ? null : Number(a.barbeiro.comissaoPercentual),
      a.servico.comissaoPercentual === null ? null : Number(a.servico.comissaoPercentual),
    );
    return soma + (c?.valor ?? 0);
  }, 0);

  return {
    ganha: centavos(Number(concluidos._sum.comissaoValor ?? 0)),
    prevista: centavos(prevista),
    concluidos: concluidos._count,
    emAberto: abertos.length,
  };
}
