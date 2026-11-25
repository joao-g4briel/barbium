// Regras dos planos de corte, sem banco: validade, ciclo do mês e limite de
// usos. Servem ao servidor e às telas (nada aqui é segredo).

export const DIAS_DO_MES_DO_PLANO = 30;
const MS_DIA = 24 * 60 * 60 * 1000;
const MS_MES = DIAS_DO_MES_DO_PLANO * MS_DIA;

export type SituacaoAssinatura = "ATIVA" | "VENCIDA" | "AGUARDANDO_PAGAMENTO" | "CANCELADA";

export const ROTULO_SITUACAO_ASSINATURA: Record<SituacaoAssinatura, string> = {
  ATIVA: "Ativa",
  VENCIDA: "Vencida",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  CANCELADA: "Cancelada",
};

export function situacaoAssinatura(
  assinatura: { validaAte: Date | null; canceladaEm: Date | null },
  agora: Date = new Date(),
): SituacaoAssinatura {
  if (assinatura.canceladaEm) return "CANCELADA";
  if (!assinatura.validaAte) return "AGUARDANDO_PAGAMENTO";
  return assinatura.validaAte > agora ? "ATIVA" : "VENCIDA";
}

// Mais um mês pago: se ainda está valendo, soma ao fim (não perde dias); se
// venceu ou nunca foi pago, conta a partir de agora.
export function estenderValidade(validaAte: Date | null, agora: Date = new Date()): Date {
  const base = validaAte && validaAte > agora ? validaAte : agora;
  return new Date(base.getTime() + MS_MES);
}

// Os meses do plano são blocos de 30 dias contados de trás pra frente a partir
// da validade: com validade em 30/12, o último mês vai de 30/11 a 30/12, o
// anterior de 31/10 a 30/11, e assim por diante. Devolve o mês em que cai a
// data, ou null se ela é depois da validade.
export function mesDoPlano(validaAte: Date, data: Date): { inicio: Date; fim: Date } | null {
  if (data >= validaAte) return null;
  // Cada mês inclui o próprio início e não inclui o fim.
  const mesesAntes = Math.ceil((validaAte.getTime() - data.getTime()) / MS_MES) - 1;
  const fim = new Date(validaAte.getTime() - mesesAntes * MS_MES);
  return { inicio: new Date(fim.getTime() - MS_MES), fim };
}

export function descreverUsos(usosPorMes: number | null): string {
  if (usosPorMes === null) return "Atendimentos ilimitados";
  return usosPorMes === 1 ? "1 atendimento por mês" : `${usosPorMes} atendimentos por mês`;
}

// Pode agendar este horário pelo plano? Devolve o motivo quando não pode.
export function motivoParaNaoUsarPlano(dados: {
  situacao: SituacaoAssinatura;
  validaAte: Date | null;
  servicoNoPlano: boolean;
  inicio: Date;
  usosPorMes: number | null;
  usosNoMes: number;
}): string | null {
  if (dados.situacao === "CANCELADA") return "Este plano foi cancelado.";
  if (dados.situacao === "AGUARDANDO_PAGAMENTO") return "O primeiro mês do plano ainda não foi pago.";
  if (dados.situacao === "VENCIDA" || !dados.validaAte) return "O plano venceu. Renove para agendar por ele.";
  if (!dados.servicoNoPlano) return "Este serviço não faz parte do seu plano.";
  if (dados.inicio >= dados.validaAte) {
    return "Esse horário é depois do vencimento do plano. Renove antes ou escolha uma data até o vencimento.";
  }
  if (dados.usosPorMes !== null && dados.usosNoMes >= dados.usosPorMes) {
    return dados.usosPorMes === 1
      ? "Você já usou o atendimento do plano neste mês."
      : `Você já usou os ${dados.usosPorMes} atendimentos do plano neste mês.`;
  }
  return null;
}
