import "server-only";
import type { SessaoPayload } from "./auth";
import { prisma } from "./prisma";

// Confere o profissional escolhido no painel: precisa ser da barbearia da
// sessão, estar ativo e atender (dono ou barbeiro). O barbeiro só agenda pra si.
export async function validarProfissional(sessao: SessaoPayload, profissionalId: string) {
  if (sessao.role === "BARBEIRO" && profissionalId !== sessao.sub) {
    return { erro: "Você só pode agendar na sua própria agenda.", status: 403 } as const;
  }

  const profissional = await prisma.usuario.findUnique({ where: { id: profissionalId } });
  if (
    !profissional ||
    profissional.barbeariaId !== sessao.barbeariaId ||
    !profissional.ativo ||
    (profissional.role !== "DONO" && profissional.role !== "BARBEIRO")
  ) {
    return { erro: "Profissional não encontrado.", status: 404 } as const;
  }

  return { profissional } as const;
}

// Confere serviço e profissional escolhidos no painel: os dois precisam ser
// da barbearia da sessão e estar ativos, e o barbeiro só agenda pra si.
export async function validarServicoEProfissional(
  sessao: SessaoPayload,
  servicoId: string,
  profissionalId: string,
) {
  const [servico, validado] = await Promise.all([
    prisma.servico.findUnique({ where: { id: servicoId } }),
    validarProfissional(sessao, profissionalId),
  ]);

  // Mesma ordem de antes: barbeiro fora da própria agenda, depois serviço,
  // depois profissional.
  if ("erro" in validado && validado.status === 403) return { erro: validado.erro, status: validado.status } as const;
  if (!servico || servico.barbeariaId !== sessao.barbeariaId || !servico.ativo) {
    return { erro: "Serviço não encontrado.", status: 404 } as const;
  }
  if ("erro" in validado) return { erro: validado.erro, status: validado.status } as const;

  return { servico, profissional: validado.profissional } as const;
}

// Duração de um agendamento já marcado, em minutos. Ao mudar o horário ele
// mantém a duração que tem, mesmo que o serviço tenha mudado de duração depois.
export function duracaoEmMinutos(agendamento: { inicio: Date; fim: Date }): number {
  return Math.round((agendamento.fim.getTime() - agendamento.inicio.getTime()) / 60000);
}
