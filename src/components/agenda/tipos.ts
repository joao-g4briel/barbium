import type { StatusAgendamento } from "@prisma/client";

// Forma serializável de um agendamento — é o que atravessa do servidor pros
// componentes de cliente (datas como ISO, valores como number).
export interface AgendamentoVM {
  id: string;
  inicio: string;
  fim: string;
  status: StatusAgendamento;
  cliente: { id: string; nome: string; telefone: string };
  servico: ServicoOpcaoVM;
  profissional: { id: string; nome: string };
  // null quando o agendamento não teve cobrança de sinal.
  sinal: { valor: number; status: "PENDENTE" | "PAGO" | null; expiraEm: string | null } | null;
}

export interface ServicoOpcaoVM {
  id: string;
  nome: string;
  duracaoMinutos: number;
  preco: number;
}

export interface GrupoAgendaVM {
  chave: string;
  rotulo: string;
  itens: AgendamentoVM[];
}

export interface GradeVM {
  // Meia-noite do dia exibido, no horário de Brasília, como instante ISO.
  inicioDia: string;
  profissionais: { id: string; nome: string }[];
}
