import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { horariosLivres } from "@/lib/agenda";

const querySchema = z.object({
  servicoId: z.string().min(1),
  profissionalId: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);

  const dados = querySchema.safeParse({
    servicoId: searchParams.get("servicoId"),
    profissionalId: searchParams.get("profissionalId"),
    data: searchParams.get("data"),
  });

  if (!dados.success) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  const barbearia = await prisma.barbearia.findUnique({ where: { slug } });
  if (!barbearia || !barbearia.ativo) {
    return NextResponse.json({ erro: "Barbearia não encontrada." }, { status: 404 });
  }

  const servico = await prisma.servico.findUnique({
    where: { id: dados.data.servicoId },
  });
  if (!servico || servico.barbeariaId !== barbearia.id || !servico.ativo) {
    return NextResponse.json({ erro: "Serviço não encontrado." }, { status: 404 });
  }

  const profissional = await prisma.usuario.findUnique({
    where: { id: dados.data.profissionalId },
  });
  if (
    !profissional ||
    profissional.barbeariaId !== barbearia.id ||
    !profissional.ativo ||
    (profissional.role !== "DONO" && profissional.role !== "BARBEIRO")
  ) {
    return NextResponse.json({ erro: "Profissional não encontrado." }, { status: 404 });
  }

  const [ano, mes, dia] = dados.data.data.split("-").map(Number);
  const dataAlvo = new Date(ano, mes - 1, dia);

  const livres = await horariosLivres({
    barbeariaId: barbearia.id,
    profissionalId: profissional.id,
    data: dataAlvo,
    duracaoMinutos: servico.duracaoMinutos,
  });

  return NextResponse.json({
    horarios: livres.map((horario) => horario.toISOString()),
  });
}
