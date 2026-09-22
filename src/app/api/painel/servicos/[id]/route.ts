import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";

const editarServicoSchema = z.object({
  nome: z.string().min(2).optional(),
  duracaoMinutos: z.coerce.number().int().min(5).max(480).optional(),
  preco: z.coerce.number().min(0).optional(),
  comissaoPercentual: z.coerce.number().min(0).max(100).optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  if (sessao.role !== "DONO") {
    return NextResponse.json(
      { erro: "Só o dono da barbearia pode editar serviços." },
      { status: 403 },
    );
  }

  const { id } = await params;

  // Nunca confiar só no id da URL: confirma que o serviço é mesmo dessa
  // barbearia antes de deixar editar — senão um dono conseguiria alterar
  // o serviço de outra barbearia só adivinhando o id.
  const servicoExistente = await prisma.servico.findUnique({ where: { id } });
  if (!servicoExistente || servicoExistente.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Serviço não encontrado." }, { status: 404 });
  }

  const corpo = await request.json().catch(() => null);
  const dados = editarServicoSchema.safeParse(corpo);

  if (!dados.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const servico = await prisma.servico.update({
    where: { id },
    data: dados.data,
  });

  return NextResponse.json({ servico });
}
