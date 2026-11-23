import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { agendamentoDoLink } from "@/lib/horario-do-cliente";
import { ANTECEDENCIA_LINK_HORAS, podeAlterarPeloLink } from "@/lib/link-cliente";
import { mudarHorario } from "@/lib/mudar-horario";
import { notificarAgendamento } from "@/lib/notificacoes";
import { consumirTentativa } from "@/lib/limite-tentativas";
import { AUTOR_CLIENTE_LINK, registrarHistorico } from "@/lib/historico";

// O cliente muda ou cancela o próprio horário pelo link da mensagem. Mesmo
// profissional e serviço; só horários livres; até ANTECEDENCIA_LINK_HORAS
// antes. A barbearia recebe o aviso no WhatsApp.

const corpoSchema = z.union([
  z.object({ acao: z.literal("cancelar") }),
  z.object({ acao: z.literal("remarcar"), inicio: z.string().datetime() }),
]);

const prazoEsgotado = `Faltam menos de ${ANTECEDENCIA_LINK_HORAS} horas para o horário. Para mudar ou cancelar, fale com a barbearia.`;

export async function POST(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const agendamento = await agendamentoDoLink(codigo);
  if (!agendamento) return NextResponse.json({ erro: "Agendamento não encontrado." }, { status: 404 });

  // O código já é secreto; isto só segura alguém clicando sem parar.
  if (!(await consumirTentativa(`meu-horario:${agendamento.id}`, 20, 60 * 60))) {
    return NextResponse.json({ erro: "Muitas tentativas. Tente de novo mais tarde." }, { status: 429 });
  }

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });

  if (agendamento.status === "CANCELADO") {
    return NextResponse.json({ erro: "Este horário já foi cancelado." }, { status: 409 });
  }
  if (!podeAlterarPeloLink(agendamento)) {
    return NextResponse.json({ erro: prazoEsgotado }, { status: 409 });
  }

  if (dados.data.acao === "cancelar") {
    // Só cancela se ainda está confirmado (a equipe pode ter mexido agora).
    const cancelado = await prisma.$transaction(async (tx) => {
      const r = await tx.agendamento.updateMany({
        where: { id: agendamento.id, status: "CONFIRMADO" },
        data: { status: "CANCELADO" },
      });
      if (r.count > 0) {
        await registrarHistorico(tx, agendamento.id, AUTOR_CLIENTE_LINK, {
          acao: "STATUS",
          statusDe: "CONFIRMADO",
          statusPara: "CANCELADO",
        });
      }
      return r;
    });
    if (cancelado.count === 0) {
      return NextResponse.json({ erro: "Este agendamento acabou de mudar. Atualize a página." }, { status: 409 });
    }
    notificarAgendamento("agendamento.cancelado_pelo_cliente", agendamento.id);
    return NextResponse.json({ ok: true });
  }

  const inicio = new Date(dados.data.inicio);
  if (inicio.getTime() - Date.now() < ANTECEDENCIA_LINK_HORAS * 60 * 60 * 1000) {
    return NextResponse.json({ erro: "Escolha um horário com pelo menos 2 horas de antecedência." }, { status: 409 });
  }
  const resultado = await mudarHorario(agendamento, inicio, agendamento.barbeiroId, AUTOR_CLIENTE_LINK);
  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });

  notificarAgendamento("agendamento.remarcado_pelo_cliente", agendamento.id, { anterior: agendamento.inicio });
  return NextResponse.json({ ok: true, inicio: resultado.agendamento.inicio, fim: resultado.agendamento.fim });
}
