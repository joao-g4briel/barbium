import "server-only";
import { prisma } from "./prisma";
import { inicioDaSemanaBrasil, fimDaSemanaBrasil } from "./fuso-brasil";
import { statusAssinatura } from "./assinatura";
import { FUSO_PADRAO } from "./fusos";

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

// ---------- Ocupação da semana por profissional ----------
// Capacidade = expediente semanal cadastrado (menos almoço); ocupado = soma
// da duração dos agendamentos não cancelados da semana corrente.

export interface OcupacaoProfissional {
  id: string;
  percentual: number;
  minutosOcupados: number;
  minutosCapacidade: number;
}

export async function obterOcupacaoSemana(
  barbeariaId: string,
  fuso: string = FUSO_PADRAO,
): Promise<Map<string, OcupacaoProfissional>> {
  const agora = new Date();
  const inicio = inicioDaSemanaBrasil(agora, fuso);
  const fim = fimDaSemanaBrasil(agora, fuso);

  const profissionais = await prisma.usuario.findMany({
    where: { barbeariaId, ativo: true, role: { in: ["DONO", "BARBEIRO"] } },
    select: {
      id: true,
      expediente: true,
      agendamentos: {
        where: { status: { not: "CANCELADO" }, inicio: { gte: inicio, lte: fim } },
        select: { servico: { select: { duracaoMinutos: true } } },
      },
    },
  });

  return new Map(
    profissionais.map((profissional) => {
      const minutosCapacidade = profissional.expediente.reduce((soma, dia) => {
        if (!dia.atende) return soma;
        let minutos = horaParaMinutos(dia.horaFim) - horaParaMinutos(dia.horaInicio);
        if (dia.almocoInicio && dia.almocoFim) {
          minutos -= horaParaMinutos(dia.almocoFim) - horaParaMinutos(dia.almocoInicio);
        }
        return soma + Math.max(0, minutos);
      }, 0);
      const minutosOcupados = profissional.agendamentos.reduce(
        (soma, agendamento) => soma + agendamento.servico.duracaoMinutos,
        0,
      );
      const percentual = minutosCapacidade > 0 ? Math.min(100, (minutosOcupados / minutosCapacidade) * 100) : 0;
      return [profissional.id, { id: profissional.id, percentual, minutosOcupados, minutosCapacidade }];
    }),
  );
}

// ---------- Assinaturas vencidas ou vencendo em breve ----------

export interface AssinaturaAVencer {
  id: string;
  nome: string;
  vencimento: Date;
  vencida: boolean;
}

export async function obterAssinaturasAVencer(
  barbeariaId: string,
  diasDeAntecedencia = 7,
  limite = 5,
): Promise<AssinaturaAVencer[]> {
  const limiteData = new Date(Date.now() + diasDeAntecedencia * 24 * 60 * 60 * 1000);

  const clientes = await prisma.cliente.findMany({
    where: { barbeariaId, assinaturaVencimento: { not: null, lte: limiteData } },
    select: { id: true, nome: true, assinaturaVencimento: true },
    orderBy: { assinaturaVencimento: "asc" },
    take: limite,
  });

  const manuais = clientes.flatMap((cliente) =>
    cliente.assinaturaVencimento
      ? [
          {
            id: cliente.id,
            nome: cliente.nome,
            vencimento: cliente.assinaturaVencimento,
            vencida: statusAssinatura(cliente.assinaturaVencimento) === "VENCIDA",
          },
        ]
      : [],
  );

  // Planos de corte: vencendo, ou vencidos há até 30 dias (depois disso a
  // lista ficaria cheia de quem não volta; eles seguem na página de planos).
  const agora = new Date();
  const planos = await prisma.assinaturaPlano.findMany({
    where: {
      barbeariaId,
      canceladaEm: null,
      validaAte: { lte: limiteData, gte: new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { validaAte: true, cliente: { select: { id: true, nome: true } } },
    orderBy: { validaAte: "asc" },
    take: limite,
  });
  const deplanos = planos.flatMap((a) =>
    a.validaAte ? [{ id: a.cliente.id, nome: a.cliente.nome, vencimento: a.validaAte, vencida: a.validaAte <= agora }] : [],
  );

  return [...manuais, ...deplanos]
    .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
    .slice(0, limite);
}
