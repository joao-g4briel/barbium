import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { horariosLivres, opcoesHorarioPainel } from "@/lib/agenda";
import { duracaoEmMinutos, validarProfissional, validarServicoEProfissional } from "@/lib/agendamento-painel";

// Dois usos: agendamento novo (servicoId: a duração vem do serviço) e mudança
// de horário (agendamentoId: a duração é a do próprio agendamento, e o lugar
// que ele ocupa hoje conta como livre).
const querySchema = z.object({
  profissionalId: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  servicoId: z.string().min(1).optional(),
  agendamentoId: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const dados = querySchema.safeParse({
    profissionalId: searchParams.get("profissionalId"),
    data: searchParams.get("data"),
    servicoId: searchParams.get("servicoId") ?? undefined,
    agendamentoId: searchParams.get("agendamentoId") ?? undefined,
  });
  if (!dados.success || (!dados.data.servicoId && !dados.data.agendamentoId)) {
    return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });
  }

  let duracaoMinutos: number;
  let profissionalId: string;
  let ignorarAgendamentoId: string | undefined;

  if (dados.data.agendamentoId) {
    const agendamento = await prisma.agendamento.findUnique({ where: { id: dados.data.agendamentoId } });
    if (
      !agendamento ||
      agendamento.barbeariaId !== sessao.barbeariaId ||
      (sessao.role === "BARBEIRO" && agendamento.barbeiroId !== sessao.sub)
    ) {
      return NextResponse.json({ erro: "Agendamento não encontrado." }, { status: 404 });
    }
    const validado = await validarProfissional(sessao, dados.data.profissionalId);
    if ("erro" in validado) return NextResponse.json({ erro: validado.erro }, { status: validado.status });
    duracaoMinutos = duracaoEmMinutos(agendamento);
    profissionalId = validado.profissional.id;
    ignorarAgendamentoId = agendamento.id;
  } else {
    const validado = await validarServicoEProfissional(sessao, dados.data.servicoId!, dados.data.profissionalId);
    if ("erro" in validado) return NextResponse.json({ erro: validado.erro }, { status: validado.status });
    duracaoMinutos = validado.servico.duracaoMinutos;
    profissionalId = validado.profissional.id;
  }

  const [ano, mes, dia] = dados.data.data.split("-").map(Number);
  const livres = await horariosLivres({
    barbeariaId: sessao.barbeariaId!,
    profissionalId,
    data: new Date(Date.UTC(ano, mes - 1, dia)),
    duracaoMinutos,
    ignorarAgendamentoId,
    ...opcoesHorarioPainel(),
  });

  return NextResponse.json({ horarios: livres.map((h) => h.toISOString()) });
}
