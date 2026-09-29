import type { Agendamento, Cliente, Servico, Usuario } from "@prisma/client";
import type { AgendamentoVM } from "@/components/agenda/tipos";

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
    servico: {
      nome: agendamento.servico.nome,
      duracaoMinutos: agendamento.servico.duracaoMinutos,
      preco: Number(agendamento.servico.preco),
    },
    profissional: { id: agendamento.barbeiro.id, nome: agendamento.barbeiro.nome },
  };
}
