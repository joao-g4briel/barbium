import { prisma } from "./prisma";

// Expediente fixo pra todo mundo, por enquanto — todo profissional atende
// nesse horário, todo dia da semana. Configurar expediente por barbeiro/dia
// é uma melhoria natural pra depois, quando o cadastro de Equipe existir.
export const HORARIO_ABERTURA = 9; // 09:00
export const HORARIO_FECHAMENTO = 19; // 19:00

export function proximosDias(quantidade: number): Date[] {
  const dias: Date[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < quantidade; i++) {
    const dia = new Date(hoje);
    dia.setDate(dia.getDate() + i);
    dias.push(dia);
  }
  return dias;
}

interface ParametrosHorariosLivres {
  barbeariaId: string;
  profissionalId: string;
  data: Date; // qualquer horário do dia desejado — só a data importa
  duracaoMinutos: number;
}

// Gera os horários possíveis dentro do expediente, em passos do tamanho do
// serviço, e remove os que colidem com algum agendamento já confirmado
// desse profissional naquele dia.
export async function horariosLivres({
  barbeariaId,
  profissionalId,
  data,
  duracaoMinutos,
}: ParametrosHorariosLivres): Promise<Date[]> {
  const inicioDoDia = new Date(data);
  inicioDoDia.setHours(HORARIO_ABERTURA, 0, 0, 0);
  const fimDoDia = new Date(data);
  fimDoDia.setHours(HORARIO_FECHAMENTO, 0, 0, 0);

  const agora = new Date();

  const agendamentosDoDia = await prisma.agendamento.findMany({
    where: {
      barbeariaId,
      barbeiroId: profissionalId,
      status: { not: "CANCELADO" },
      inicio: { gte: inicioDoDia, lt: fimDoDia },
    },
    select: { inicio: true, fim: true },
  });

  const passoMs = duracaoMinutos * 60 * 1000;
  const livres: Date[] = [];

  for (
    let horario = new Date(inicioDoDia);
    horario.getTime() + passoMs <= fimDoDia.getTime();
    horario = new Date(horario.getTime() + passoMs)
  ) {
    if (horario < agora) continue; // não oferece horário que já passou

    const fimCandidato = new Date(horario.getTime() + passoMs);
    const conflita = agendamentosDoDia.some(
      (agendamento) => horario < agendamento.fim && fimCandidato > agendamento.inicio,
    );

    if (!conflita) livres.push(horario);
  }

  return livres;
}
