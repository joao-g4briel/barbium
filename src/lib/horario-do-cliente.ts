import "server-only";
import { prisma } from "./prisma";
import { agendamentoDoCodigo } from "./link-cliente";

// Agendamento por trás de um link de cliente (/meu-horario/<código>), ou null
// se o código não confere ou a barbearia está suspensa.
export async function agendamentoDoLink(codigo: string) {
  const id = agendamentoDoCodigo(decodeURIComponent(codigo));
  if (!id) return null;
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: {
      cliente: { select: { nome: true } },
      servico: { select: { nome: true, preco: true } },
      barbeiro: { select: { nome: true } },
      barbearia: {
        select: { nome: true, slug: true, telefone: true, ativo: true, endereco: true, corMarca: true, logoAtualizadoEm: true },
      },
    },
  });
  if (!agendamento || !agendamento.barbearia.ativo) return null;
  return agendamento;
}
