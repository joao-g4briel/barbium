import "server-only";
import type { SessaoPayload } from "./auth";
import { prisma } from "./prisma";

// Confere serviço e profissional escolhidos no painel: os dois precisam ser
// da barbearia da sessão e estar ativos, e o barbeiro só agenda pra si.
export async function validarServicoEProfissional(
  sessao: SessaoPayload,
  servicoId: string,
  profissionalId: string,
) {
  if (sessao.role === "BARBEIRO" && profissionalId !== sessao.sub) {
    return { erro: "Você só pode agendar na sua própria agenda.", status: 403 } as const;
  }

  const [servico, profissional] = await Promise.all([
    prisma.servico.findUnique({ where: { id: servicoId } }),
    prisma.usuario.findUnique({ where: { id: profissionalId } }),
  ]);

  if (!servico || servico.barbeariaId !== sessao.barbeariaId || !servico.ativo) {
    return { erro: "Serviço não encontrado.", status: 404 } as const;
  }
  if (
    !profissional ||
    profissional.barbeariaId !== sessao.barbeariaId ||
    !profissional.ativo ||
    (profissional.role !== "DONO" && profissional.role !== "BARBEIRO")
  ) {
    return { erro: "Profissional não encontrado.", status: 404 } as const;
  }

  return { servico, profissional } as const;
}
