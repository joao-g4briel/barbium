import { prisma } from "./prisma";
import { diaDaSemanaBrasil, horarioBrasil } from "./fuso-brasil";
import type { DiaSemana } from "@prisma/client";

const DIAS_SEMANA_POR_INDICE: DiaSemana[] = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
];

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

interface Intervalo {
  inicio: Date;
  fim: Date;
}

interface ParametrosHorariosLivres {
  barbeariaId: string;
  profissionalId: string;
  data: Date; // meia-noite UTC do dia desejado (ver inicioDoDiaBrasil)
  duracaoMinutos: number;
}

// Gera os horários possíveis dentro do expediente do profissional pra
// aquele dia da semana, e remove os que colidem com agendamentos já
// confirmados, com o intervalo de almoço, ou com algum bloqueio de agenda
// (folga, férias, trava de emergência). Todo o cálculo é no horário de
// Brasília, não no fuso onde o servidor está rodando.
export async function horariosLivres({
  barbeariaId,
  profissionalId,
  data,
  duracaoMinutos,
}: ParametrosHorariosLivres): Promise<Date[]> {
  const diaSemana = DIAS_SEMANA_POR_INDICE[diaDaSemanaBrasil(data)];

  const expediente = await prisma.expedienteDia.findUnique({
    where: { usuarioId_diaSemana: { usuarioId: profissionalId, diaSemana } },
  });

  if (!expediente || !expediente.atende) return [];

  const inicioDoDia = horarioBrasil(data, horaParaMinutos(expediente.horaInicio));
  const fimDoDia = horarioBrasil(data, horaParaMinutos(expediente.horaFim));
  if (fimDoDia <= inicioDoDia) return [];

  const [agendamentosDoDia, bloqueiosRelevantes] = await Promise.all([
    prisma.agendamento.findMany({
      where: {
        barbeariaId,
        barbeiroId: profissionalId,
        status: { not: "CANCELADO" },
        inicio: { gte: inicioDoDia, lt: fimDoDia },
      },
      select: { inicio: true, fim: true },
    }),
    prisma.bloqueioAgenda.findMany({
      where: {
        usuarioId: profissionalId,
        inicio: { lt: fimDoDia },
        OR: [{ fim: null }, { fim: { gt: inicioDoDia } }],
      },
      select: { inicio: true, fim: true },
    }),
  ]);

  const ocupados: Intervalo[] = [
    ...agendamentosDoDia,
    // Bloqueio indefinido (fim null, a trava de emergência) conta como
    // ocupando o resto desse dia inteiro.
    ...bloqueiosRelevantes.map((b) => ({ inicio: b.inicio, fim: b.fim ?? fimDoDia })),
  ];

  if (expediente.almocoInicio && expediente.almocoFim) {
    ocupados.push({
      inicio: horarioBrasil(data, horaParaMinutos(expediente.almocoInicio)),
      fim: horarioBrasil(data, horaParaMinutos(expediente.almocoFim)),
    });
  }

  const agora = new Date();
  const passoMs = duracaoMinutos * 60 * 1000;
  const livres: Date[] = [];

  for (
    let horario = new Date(inicioDoDia);
    horario.getTime() + passoMs <= fimDoDia.getTime();
    horario = new Date(horario.getTime() + passoMs)
  ) {
    if (horario < agora) continue;

    const fimCandidato = new Date(horario.getTime() + passoMs);
    const conflita = ocupados.some((o) => horario < o.fim && fimCandidato > o.inicio);

    if (!conflita) livres.push(horario);
  }

  return livres;
}
