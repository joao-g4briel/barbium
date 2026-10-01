import type { Agendamento, Cliente, Servico, Usuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AgendamentoVM, ServicoOpcaoVM } from "@/components/agenda/tipos";

export type AgendamentoCompleto = Agendamento & { cliente: Cliente; servico: Servico; barbeiro: Usuario };

export const INCLUIR_AGENDAMENTO_COMPLETO = { cliente: true, servico: true, barbeiro: true } as const;

export function paraAgendamentoVM(agendamento: AgendamentoCompleto): AgendamentoVM {
  return {
    id: agendamento.id,
    inicio: agendamento.inicio.toISOString(),
    fim: agendamento.fim.toISOString(),
    status: agendamento.status,
    cliente: {
      id: agendamento.cliente.id,
      nome: agendamento.cliente.nome,
      telefone: agendamento.cliente.telefone,
    },
    servico: paraServicoOpcaoVM(agendamento.servico),
    profissional: { id: agendamento.barbeiro.id, nome: agendamento.barbeiro.nome },
    sinal:
      agendamento.sinalValor === null
        ? null
        : {
            valor: Number(agendamento.sinalValor),
            status: agendamento.sinalStatus,
            expiraEm: agendamento.sinalExpiraEm?.toISOString() ?? null,
          },
  };
}

export function paraServicoOpcaoVM(servico: Pick<Servico, "id" | "nome" | "duracaoMinutos" | "preco">): ServicoOpcaoVM {
  return {
    id: servico.id,
    nome: servico.nome,
    duracaoMinutos: servico.duracaoMinutos,
    preco: Number(servico.preco),
  };
}

// Serviços oferecidos na troca de serviço do painel de agendamento.
export async function obterServicosAtivos(barbeariaId: string): Promise<ServicoOpcaoVM[]> {
  const servicos = await prisma.servico.findMany({
    where: { barbeariaId, ativo: true },
    select: { id: true, nome: true, duracaoMinutos: true, preco: true },
    orderBy: { nome: "asc" },
  });
  return servicos.map(paraServicoOpcaoVM);
}
