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

const MOTIVOS = {
  cliente: {
    cancelada: "Este plano foi cancelado.",
    aguardando: "O primeiro mês do plano ainda não foi pago.",
    vencida: "O plano venceu. Renove para agendar por ele.",
    servico: "Este serviço não faz parte do seu plano.",
    depois: "Esse horário é depois do vencimento do plano. Renove antes ou escolha uma data até o vencimento.",
    limite: (usos: number) =>
      usos === 1
        ? "Você já usou o atendimento do plano neste mês."
        : `Você já usou os ${usos} atendimentos do plano neste mês.`,
  },
  equipe: {
    cancelada: "O plano deste cliente foi encerrado.",
    aguardando: "O primeiro mês do plano deste cliente ainda não foi pago.",
    vencida: "O plano deste cliente venceu.",
    servico: "Este serviço não faz parte do plano do cliente.",
    depois: "Esse horário é depois do vencimento do plano do cliente.",
    limite: (usos: number) =>
      usos === 1
        ? "O cliente já usou o atendimento do plano no mês desse horário."
        : `O cliente já usou os ${usos} atendimentos do plano no mês desse horário.`,
  },
};

// Pode agendar este horário pelo plano? Devolve o motivo quando não pode,
// escrito pra quem está agendando (o cliente pelo link, ou a equipe).
export function motivoParaNaoUsarPlano(
  dados: {
    situacao: SituacaoAssinatura;
    validaAte: Date | null;
    servicoNoPlano: boolean;
    inicio: Date;
    usosPorMes: number | null;
    usosNoMes: number;
  },
  pessoa: "cliente" | "equipe" = "cliente",
): string | null {
  const m = MOTIVOS[pessoa];
  if (dados.situacao === "CANCELADA") return m.cancelada;
  if (dados.situacao === "AGUARDANDO_PAGAMENTO") return m.aguardando;
  if (dados.situacao === "VENCIDA" || !dados.validaAte) return m.vencida;
  if (!dados.servicoNoPlano) return m.servico;
  if (dados.inicio >= dados.validaAte) return m.depois;
  if (dados.usosPorMes !== null && dados.usosNoMes >= dados.usosPorMes) return m.limite(dados.usosPorMes);
  return null;
}

// Folga depois de cada mês pago no cartão: a cobrança seguinte pode sair um
// ou dois dias depois (fim de semana, nova tentativa), sem cortar o plano.
export const FOLGA_CARTAO_DIAS = 3;

// Mesmo dia do mês seguinte, em UTC; 31/01 vira 28 (ou 29)/02.
export function somarUmMes(data: Date): Date {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth() + 1;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const resultado = new Date(data);
  resultado.setUTCFullYear(ano, mes, Math.min(data.getUTCDate(), ultimoDia));
  return resultado;
}

// Cobrança do cartão aprovada: o cartão cobra por mês do calendário, então a
// validade vai até um mês depois da cobrança (com a folga), sem somar em
// cima do que já valia. Nunca encurta uma validade maior.
export function validadeDoCartao(validaAte: Date | null, dataCobranca: Date): Date {
  const nova = new Date(somarUmMes(dataCobranca).getTime() + FOLGA_CARTAO_DIAS * MS_DIA);
  return validaAte && validaAte > nova ? validaAte : nova;
}

// "Plano X" para o caixa e o Mercado Pago, sem repetir quando o nome já
// começa com "Plano" (ex.: "Plano de Corte").
export function nomeDoPlano(nome: string): string {
  const limpo = nome.trim();
  return /^plano\b/i.test(limpo) ? limpo : `Plano ${limpo}`;
}
