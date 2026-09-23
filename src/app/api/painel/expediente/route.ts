import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { ORDEM_DIAS_SEMANA } from "@/lib/dias-semana";

const horaRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const diaSchema = z.object({
  diaSemana: z.enum(["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"]),
  atende: z.boolean(),
  horaInicio: z.string().regex(horaRegex, "Horário inválido."),
  horaFim: z.string().regex(horaRegex, "Horário inválido."),
  almocoInicio: z.string().regex(horaRegex).nullable().optional(),
  almocoFim: z.string().regex(horaRegex).nullable().optional(),
});

const corpoSchema = z.object({ dias: z.array(diaSchema).length(7) });

// O expediente é sempre do próprio usuário logado — hoje não existe
// cadastro de Equipe, então o dono só edita o expediente dele mesmo.
// Quando existir, o dono ganha uma forma de editar o de cada barbeiro.
export async function GET() {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const expediente = await prisma.expedienteDia.findMany({
    where: { usuarioId: sessao.sub },
  });

  const porDia = new Map(expediente.map((e) => [e.diaSemana, e]));

  const dias = ORDEM_DIAS_SEMANA.map((diaSemana) => {
    const existente = porDia.get(diaSemana);
    return {
      diaSemana,
      atende: existente?.atende ?? false,
      horaInicio: existente?.horaInicio ?? "09:00",
      horaFim: existente?.horaFim ?? "19:00",
      almocoInicio: existente?.almocoInicio ?? null,
      almocoFim: existente?.almocoFim ?? null,
    };
  });

  return NextResponse.json({ dias });
}

export async function PUT(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const corpo = await request.json().catch(() => null);
  const dados = corpoSchema.safeParse(corpo);
  if (!dados.success) {
    return NextResponse.json(
      { erro: dados.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  for (const dia of dados.data.dias) {
    if (dia.atende && dia.horaFim <= dia.horaInicio) {
      return NextResponse.json(
        { erro: `Horário de fim precisa ser depois do início (${dia.diaSemana}).` },
        { status: 400 },
      );
    }
    if ((dia.almocoInicio && !dia.almocoFim) || (!dia.almocoInicio && dia.almocoFim)) {
      return NextResponse.json(
        { erro: "Preencha início e fim do almoço, ou deixe os dois em branco." },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(
    dados.data.dias.map((dia) =>
      prisma.expedienteDia.upsert({
        where: { usuarioId_diaSemana: { usuarioId: sessao.sub, diaSemana: dia.diaSemana } },
        update: {
          atende: dia.atende,
          horaInicio: dia.horaInicio,
          horaFim: dia.horaFim,
          almocoInicio: dia.almocoInicio ?? null,
          almocoFim: dia.almocoFim ?? null,
        },
        create: {
          usuarioId: sessao.sub,
          diaSemana: dia.diaSemana,
          atende: dia.atende,
          horaInicio: dia.horaInicio,
          horaFim: dia.horaFim,
          almocoInicio: dia.almocoInicio ?? null,
          almocoFim: dia.almocoFim ?? null,
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
