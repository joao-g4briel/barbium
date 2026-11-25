import { NextResponse } from "next/server";
import { z } from "zod";
import { agendamentoDoLink } from "@/lib/horario-do-cliente";
import { ANTECEDENCIA_LINK_HORAS, podeAlterarPeloLink } from "@/lib/link-cliente";
import { horariosLivres } from "@/lib/agenda";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import { ianaDoFuso } from "@/lib/fusos";
import { diaDentroDoPeriodo, primeiroHorarioAceito } from "@/lib/pagina-agendamento";

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
  const dataAlvo = new Date(Date.UTC(ano, mes - 1, dia));
  const hoje = inicioDoDiaBrasil(new Date(), ianaDoFuso(agendamento.barbearia.fuso));
  if (!diaDentroDoPeriodo(dataAlvo, hoje, agendamento.barbearia)) return NextResponse.json({ horarios: [] });

  // Vale o maior prazo: o do link (2 horas) ou a antecedência da barbearia.
  const prazoLink = new Date(Date.now() + ANTECEDENCIA_LINK_HORAS * 60 * 60 * 1000);
  const prazoBarbearia = primeiroHorarioAceito(agendamento.barbearia);
  const livres = await horariosLivres({
    barbeariaId: agendamento.barbeariaId,
    profissionalId: agendamento.barbeiroId,
    data: dataAlvo,
    duracaoMinutos: Math.round((agendamento.fim.getTime() - agendamento.inicio.getTime()) / 60000),
    ignorarAgendamentoId: agendamento.id,
    aceitarDesde: prazoBarbearia > prazoLink ? prazoBarbearia : prazoLink,
  });

  return NextResponse.json({
    horarios: livres.filter((h) => h.getTime() !== agendamento.inicio.getTime()).map((h) => h.toISOString()),
  });
}
