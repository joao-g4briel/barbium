import { prisma } from "./prisma";
import { horarioBrasil } from "./fuso-brasil";
import { liberarSinaisExpirados } from "./sinal";
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
  // Intervalo entre os horários oferecidos. Padrão: a duração do serviço.
  passoMinutos?: number;
  // Primeiro início aceito. Padrão: agora.
  aceitarDesde?: Date;
}

// No painel a grade é mais fina (encaixes) e aceita o horário que acabou de
// começar, pra registrar quem chegou na hora.
export const PASSO_PAINEL_MINUTOS = 15;

export function opcoesHorarioPainel() {
  return {
    passoMinutos: PASSO_PAINEL_MINUTOS,
    aceitarDesde: new Date(Date.now() - PASSO_PAINEL_MINUTOS * 60 * 1000),
  };
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
  passoMinutos,
  aceitarDesde,
}: ParametrosHorariosLivres): Promise<Date[]> {
  // `data` já chega como meia-noite UTC do dia certo em Brasília (ver o
  // comentário no parâmetro) — não é um instante bruto que precise passar
  // pela conversão de fuso de novo. Aplicar diaDaSemanaBrasil aqui seria
  // subtrair 3h de um valor que já é meia-noite exata, empurrando pro dia
  // anterior. Por isso é getUTCDay() direto, sem o helper de fuso.
  const diaSemana = DIAS_SEMANA_POR_INDICE[data.getUTCDay()];

  const expediente = await prisma.expedienteDia.findUnique({
    where: { usuarioId_diaSemana: { usuarioId: profissionalId, diaSemana } },
  });

  if (!expediente || !expediente.atende) return [];

  const inicioDoDia = horarioBrasil(data, horaParaMinutos(expediente.horaInicio));
  const fimDoDia = horarioBrasil(data, horaParaMinutos(expediente.horaFim));
  if (fimDoDia <= inicioDoDia) return [];

  await liberarSinaisExpirados(barbeariaId);

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

  const primeiroAceito = aceitarDesde ?? new Date();
  const duracaoMs = duracaoMinutos * 60 * 1000;
  const passoMs = (passoMinutos ?? duracaoMinutos) * 60 * 1000;
  const livres: Date[] = [];

  for (
    let horario = new Date(inicioDoDia);
    horario.getTime() + duracaoMs <= fimDoDia.getTime();
    horario = new Date(horario.getTime() + passoMs)
  ) {
    if (horario < primeiroAceito) continue;

    const fimCandidato = new Date(horario.getTime() + duracaoMs);
    const conflita = ocupados.some((o) => horario < o.fim && fimCandidato > o.inicio);

    if (!conflita) livres.push(horario);
  }

  return livres;
}
