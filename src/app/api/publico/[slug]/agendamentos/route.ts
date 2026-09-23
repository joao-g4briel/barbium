import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { horariosLivres } from "@/lib/agenda";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";

const corpoSchema = z.object({
  servicoId: z.string().min(1),
  profissionalId: z.string().min(1),
  inicio: z.string().datetime(),
  nome: z.string().min(2, "Informe seu nome."),
  telefone: z.string().min(8, "Informe um telefone válido."),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const corpo = await request.json().catch(() => null);
  const dados = corpoSchema.safeParse(corpo);

  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const barbearia = await prisma.barbearia.findUnique({ where: { slug } });
  if (!barbearia || !barbearia.ativo) {
    return NextResponse.json({ erro: "Barbearia não encontrada." }, { status: 404 });
  }

  const servico = await prisma.servico.findUnique({ where: { id: dados.data.servicoId } });
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

  const inicio = new Date(dados.data.inicio);
  if (inicio.getTime() < Date.now()) {
    return NextResponse.json({ erro: "Esse horário já passou." }, { status: 400 });
  }
  const fim = new Date(inicio.getTime() + servico.duracaoMinutos * 60 * 1000);

  const telefoneNormalizado = dados.data.telefone.replace(/\D/g, "");
  if (telefoneNormalizado.length < 8) {
    return NextResponse.json({ erro: "Informe um telefone válido." }, { status: 400 });
  }

  // Confere se esse horário respeita o expediente do profissional (dia,
  // horário, almoço) e não cai em cima de um bloqueio — reaproveita a
  // mesma função que gera a lista de horários oferecidos, pra não ter
  // duas regras de negócio diferentes que podem se desalinhar.
  const inicioDoDia = inicioDoDiaBrasil(inicio);
  const disponiveis = await horariosLivres({
    barbeariaId: barbearia.id,
    profissionalId: profissional.id,
    data: inicioDoDia,
    duracaoMinutos: servico.duracaoMinutos,
  });
  const aindaDisponivel = disponiveis.some((h) => h.getTime() === inicio.getTime());
  if (!aindaDisponivel) {
    return NextResponse.json(
      { erro: "Esse horário não está mais disponível. Escolha outro." },
      { status: 409 },
    );
  }

  try {
    const agendamento = await prisma.$transaction(async (tx) => {
      // Confere de novo, dentro da transação, se ninguém pegou esse
      // horário entre o momento em que a lista foi carregada e agora —
      // é a proteção contra dois clientes confirmarem o mesmo horário.
      const conflito = await tx.agendamento.findFirst({
        where: {
          barbeariaId: barbearia.id,
          barbeiroId: profissional.id,
          status: { not: "CANCELADO" },
          inicio: { lt: fim },
          fim: { gt: inicio },
        },
      });

      if (conflito) {
        throw new Error("HORARIO_INDISPONIVEL");
      }

      const cliente = await tx.cliente.upsert({
        where: {
          barbeariaId_telefone: { barbeariaId: barbearia.id, telefone: telefoneNormalizado },
        },
        update: { nome: dados.data.nome },
        create: {
          nome: dados.data.nome,
          telefone: telefoneNormalizado,
          barbeariaId: barbearia.id,
        },
      });

      return tx.agendamento.create({
        data: {
          inicio,
          fim,
          status: "CONFIRMADO",
          barbeariaId: barbearia.id,
          clienteId: cliente.id,
          servicoId: servico.id,
          barbeiroId: profissional.id,
        },
      });
    });

    return NextResponse.json({ agendamento });
  } catch (erro) {
    if (erro instanceof Error && erro.message === "HORARIO_INDISPONIVEL") {
      return NextResponse.json(
        { erro: "Esse horário acabou de ser preenchido. Escolha outro." },
        { status: 409 },
      );
    }
    throw erro;
  }
}
