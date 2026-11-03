import "server-only";
import type { Prisma } from "@prisma/client";

// Acha o cliente pelo telefone ou cadastra, sem trocar o nome de quem já
// existe. Não usa upsert: o do Prisma lê e depois insere, e dois pedidos do
// mesmo telefone novo ao mesmo tempo (toque duplo em "Confirmar") quebravam
// com violação de unicidade. O createMany com skipDuplicates vira um INSERT
// ... ON CONFLICT DO NOTHING, que espera o outro pedido terminar em vez de
// falhar; a busca seguinte já enxerga o cliente gravado por qualquer um dos dois.
export async function obterOuCriarCliente(
  tx: Prisma.TransactionClient,
  dados: { barbeariaId: string; telefone: string; nome: string },
) {
  await tx.cliente.createMany({ data: [dados], skipDuplicates: true });
  return tx.cliente.findUniqueOrThrow({
    where: { barbeariaId_telefone: { barbeariaId: dados.barbeariaId, telefone: dados.telefone } },
  });
}
