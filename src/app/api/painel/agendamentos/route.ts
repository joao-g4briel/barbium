import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { horariosLivres, opcoesHorarioPainel } from "@/lib/agenda";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import { validarServicoEProfissional } from "@/lib/agendamento-painel";

const corpoSchema = z.object({
  servicoId: z.string().min(1),
  profissionalId: z.string().min(1),
  inicio: z.string().datetime(),
  cliente: z.union([
    z.object({ id: z.string().min(1) }),
    z.object({
      nome: z.string().trim().min(2, "Informe o nome do cliente."),
      telefone: z.string().min(8, "Informe um telefone válido."),
    }),
  ]),
});

class HorarioIndisponivel extends Error {}

// Agendamento feito pela equipe (telefone, balcão, encaixe). Mesmas regras do
// link público — expediente, almoço, folgas e conflito —, com a grade de 15
// em 15 minutos do painel. Entra confirmado, sem sinal.
export async function POST(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  const barbeariaId = sessao.barbeariaId!;

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    // Só as mensagens escritas aqui (em português) vão pra tela; o resto é genérico.
    const nossa = dados.error.issues.find((i) => i.message.startsWith("Informe"))?.message;
    return NextResponse.json({ erro: nossa ?? "Dados inválidos." }, { status: 400 });
  }

  const validado = await validarServicoEProfissional(sessao, dados.data.servicoId, dados.data.profissionalId);
  if ("erro" in validado) return NextResponse.json({ erro: validado.erro }, { status: validado.status });
  const { servico, profissional } = validado;

  const clienteEscolhido = dados.data.cliente;
  let telefoneNovo: string | null = null;
  if ("id" in clienteEscolhido) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteEscolhido.id } });
    if (!cliente || cliente.barbeariaId !== barbeariaId) {
      return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
    }
  } else {
    telefoneNovo = clienteEscolhido.telefone.replace(/\D/g, "");
    if (telefoneNovo.length < 8) {
      return NextResponse.json({ erro: "Informe um telefone válido." }, { status: 400 });
    }
  }

  const inicio = new Date(dados.data.inicio);
  const fim = new Date(inicio.getTime() + servico.duracaoMinutos * 60 * 1000);

  const disponiveis = await horariosLivres({
    barbeariaId,
    profissionalId: profissional.id,
    data: inicioDoDiaBrasil(inicio),
    duracaoMinutos: servico.duracaoMinutos,
    ...opcoesHorarioPainel(),
  });
  if (!disponiveis.some((h) => h.getTime() === inicio.getTime())) {
    return NextResponse.json({ erro: "Esse horário não está mais disponível. Escolha outro." }, { status: 409 });
  }

  try {
    const agendamento = await prisma.$transaction(async (tx) => {
      const conflito = await tx.agendamento.findFirst({
        where: {
          barbeariaId,
          barbeiroId: profissional.id,
          status: { not: "CANCELADO" },
          inicio: { lt: fim },
          fim: { gt: inicio },
        },
      });
      if (conflito) throw new HorarioIndisponivel();

      let clienteId: string;
      if ("id" in clienteEscolhido) {
        clienteId = clienteEscolhido.id;
      } else {
        // Telefone já cadastrado: usa o cliente existente sem trocar o nome.
        const cliente = await tx.cliente.upsert({
          where: { barbeariaId_telefone: { barbeariaId, telefone: telefoneNovo! } },
          update: {},
          create: { nome: clienteEscolhido.nome, telefone: telefoneNovo!, barbeariaId },
        });
        clienteId = cliente.id;
      }

      return tx.agendamento.create({
        data: {
          inicio,
          fim,
          status: "CONFIRMADO",
          barbeariaId,
          clienteId,
          servicoId: servico.id,
          barbeiroId: profissional.id,
        },
        include: { cliente: { select: { nome: true } } },
      });
    });

    return NextResponse.json({ agendamento: { id: agendamento.id, inicio: agendamento.inicio, cliente: agendamento.cliente.nome } });
  } catch (erro) {
    if (erro instanceof HorarioIndisponivel) {
      return NextResponse.json({ erro: "Esse horário acabou de ser preenchido. Escolha outro." }, { status: 409 });
    }
    throw erro;
  }
}
