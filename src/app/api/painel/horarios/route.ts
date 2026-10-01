import { NextResponse } from "next/server";
import { z } from "zod";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { horariosLivres, opcoesHorarioPainel } from "@/lib/agenda";
import { validarServicoEProfissional } from "@/lib/agendamento-painel";

const querySchema = z.object({
  servicoId: z.string().min(1),
  profissionalId: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const dados = querySchema.safeParse({
    servicoId: searchParams.get("servicoId"),
    profissionalId: searchParams.get("profissionalId"),
    data: searchParams.get("data"),
  });
  if (!dados.success) return NextResponse.json({ erro: "Parâmetros inválidos." }, { status: 400 });

  const validado = await validarServicoEProfissional(sessao, dados.data.servicoId, dados.data.profissionalId);
  if ("erro" in validado) return NextResponse.json({ erro: validado.erro }, { status: validado.status });

  const [ano, mes, dia] = dados.data.data.split("-").map(Number);
  const livres = await horariosLivres({
    barbeariaId: sessao.barbeariaId!,
    profissionalId: validado.profissional.id,
    data: new Date(Date.UTC(ano, mes - 1, dia)),
    duracaoMinutos: validado.servico.duracaoMinutos,
    ...opcoesHorarioPainel(),
  });

  return NextResponse.json({ horarios: livres.map((h) => h.toISOString()) });
}
