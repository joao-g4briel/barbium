import { NextResponse } from "next/server";
import { acessoVencido } from "@/lib/acesso";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { horariosLivres } from "@/lib/agenda";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import { ianaDoFuso } from "@/lib/fusos";
import { diaDentroDoPeriodo, primeiroHorarioAceito } from "@/lib/pagina-agendamento";

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
  if (!barbearia || !barbearia.ativo || acessoVencido(barbearia)) {
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
  const dataAlvo = new Date(Date.UTC(ano, mes - 1, dia));

  // Regras da barbearia pro link: até quantos dias à frente e com quanta
  // antecedência (lib/pagina-agendamento).
  const hoje = inicioDoDiaBrasil(new Date(), ianaDoFuso(barbearia.fuso));
  if (!diaDentroDoPeriodo(dataAlvo, hoje, barbearia)) return NextResponse.json({ horarios: [] });

  const livres = await horariosLivres({
    barbeariaId: barbearia.id,
    profissionalId: profissional.id,
    data: dataAlvo,
    duracaoMinutos: servico.duracaoMinutos,
    aceitarDesde: primeiroHorarioAceito(barbearia),
  });

  return NextResponse.json({
    horarios: livres.map((horario) => horario.toISOString()),
  });
}
