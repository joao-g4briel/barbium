// Personalização do link de agendamento: quanto antes o cliente precisa
// marcar e até quantos dias à frente ele pode. Valem para o link público e
// para o cliente remarcar pelo link; o painel continua livre (a equipe
// encaixa quem chega na hora). Sem banco: serve ao servidor e às telas.

export const MENSAGEM_AGENDAMENTO_MAXIMO = 200;
export const DESCRICAO_SERVICO_MAXIMO = 120;

export const ANTECEDENCIA_OPCOES: { minutos: number; rotulo: string }[] = [
  { minutos: 0, rotulo: "Sem mínimo" },
  { minutos: 30, rotulo: "30 minutos" },
  { minutos: 60, rotulo: "1 hora" },
  { minutos: 120, rotulo: "2 horas" },
  { minutos: 180, rotulo: "3 horas" },
  { minutos: 360, rotulo: "6 horas" },
  { minutos: 720, rotulo: "12 horas" },
  { minutos: 1440, rotulo: "1 dia" },
];

export const DIAS_A_FRENTE_OPCOES: { dias: number; rotulo: string }[] = [
  { dias: 7, rotulo: "1 semana" },
  { dias: 14, rotulo: "2 semanas" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 60, rotulo: "60 dias" },
];

export function antecedenciaValida(minutos: number): boolean {
  return ANTECEDENCIA_OPCOES.some((o) => o.minutos === minutos);
}

export function diasAFrenteValido(dias: number): boolean {
  return DIAS_A_FRENTE_OPCOES.some((o) => o.dias === dias);
}

export interface RegrasAgendamento {
  antecedenciaMinimaMin: number;
  diasAFrente: number;
}

const MS_MIN = 60 * 1000;
const MS_DIA = 24 * 60 * MS_MIN;

// Primeiro instante que o cliente pode marcar.
export function primeiroHorarioAceito(regras: RegrasAgendamento, agora: Date = new Date()): Date {
  return new Date(agora.getTime() + regras.antecedenciaMinimaMin * MS_MIN);
}

// O dia de calendário (meia-noite UTC que representa o dia, como em
// inicioDoDiaBrasil) está dentro dos dias que a barbearia abre? Hoje é o
// dia 0; com 7 dias à frente, vale de hoje até hoje + 6.
export function diaDentroDoPeriodo(dia: Date, hoje: Date, regras: RegrasAgendamento): boolean {
  const diferenca = Math.round((dia.getTime() - hoje.getTime()) / MS_DIA);
  return diferenca >= 0 && diferenca < regras.diasAFrente;
}

// Motivo, para o cliente, de um horário não poder ser marcado pelo link.
export function motivoForaDasRegras(
  inicio: Date,
  dia: Date,
  hoje: Date,
  regras: RegrasAgendamento,
  agora: Date = new Date(),
): string | null {
  if (!diaDentroDoPeriodo(dia, hoje, regras)) {
    return `Dá para agendar até ${regras.diasAFrente} dias à frente. Escolha uma data mais próxima.`;
  }
  if (inicio < primeiroHorarioAceito(regras, agora)) {
    const opcao = ANTECEDENCIA_OPCOES.find((o) => o.minutos === regras.antecedenciaMinimaMin);
    return regras.antecedenciaMinimaMin > 0
      ? `Esta barbearia pede pelo menos ${opcao?.rotulo.toLowerCase() ?? `${regras.antecedenciaMinimaMin} minutos`} de antecedência. Escolha um horário mais tarde.`
      : "Esse horário já passou.";
  }
  return null;
}
