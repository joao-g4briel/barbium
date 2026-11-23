import { NextResponse } from "next/server";
import { z } from "zod";
import { agendamentoDoLink } from "@/lib/horario-do-cliente";
import { ANTECEDENCIA_LINK_HORAS, podeAlterarPeloLink } from "@/lib/link-cliente";
import { horariosLivres } from "@/lib/agenda";

// Horários livres pro cliente remarcar pelo link: mesmo profissional, mesma
// duração, e o lugar que o horário dele ocupa conta como livre.
const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const agendamento = await agendamentoDoLink(codigo);
  if (!agendamento) return NextResponse.json({ erro: "Agendamento não encontrado." }, { status: 404 });
  if (!podeAlterarPeloLink(agendamento)) return NextResponse.json({ horarios: [] });

  const data = dataSchema.safeParse(new URL(request.url).searchParams.get("data"));
  if (!data.success) return NextResponse.json({ erro: "Data inválida." }, { status: 400 });

  const [ano, mes, dia] = data.data.split("-").map(Number);
  const livres = await horariosLivres({
    barbeariaId: agendamento.barbeariaId,
    profissionalId: agendamento.barbeiroId,
    data: new Date(Date.UTC(ano, mes - 1, dia)),
    duracaoMinutos: Math.round((agendamento.fim.getTime() - agendamento.inicio.getTime()) / 60000),
    ignorarAgendamentoId: agendamento.id,
    // Mesmo prazo de antecedência do link.
    aceitarDesde: new Date(Date.now() + ANTECEDENCIA_LINK_HORAS * 60 * 60 * 1000),
  });

  return NextResponse.json({
    horarios: livres.filter((h) => h.getTime() !== agendamento.inicio.getTime()).map((h) => h.toISOString()),
  });
}
