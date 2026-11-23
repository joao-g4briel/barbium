import "server-only";
import { prisma } from "./prisma";

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
