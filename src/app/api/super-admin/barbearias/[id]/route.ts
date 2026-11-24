import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirSuperAdmin } from "@/lib/sessao";
import { contarProfissionaisAtivos } from "@/lib/equipe";
import { LIMITE_PROFISSIONAIS, ROTULO_PLANO, descreverLimite } from "@/lib/planos";

const atualizarSchema = z.object({
  plano: z.enum(["SOLO", "BARBEARIA", "REDE"]).optional(),
  ativo: z.boolean().optional(),
  // Adicional de WhatsApp pago (liga ou desliga as mensagens depois do teste).
  whatsappAtivo: z.boolean().optional(),
  // Pagamento confirmado: estende o prazo de uso, ou tira o prazo.
  acesso: z
    .union([z.object({ meses: z.union([z.literal(1), z.literal(6), z.literal(12)]) }), z.object({ semPrazo: z.literal(true) })])
    .optional(),
});

// Soma meses a partir do fim do prazo atual, ou de agora se já venceu.
function estenderAcesso(acessoAte: Date | null, meses: number): Date {
  const agora = new Date();
  const base = acessoAte && acessoAte > agora ? new Date(acessoAte) : agora;
  base.setMonth(base.getMonth() + meses);
  return base;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigirSuperAdmin();
  } catch {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;
  const corpo = await request.json().catch(() => null);
  const dados = atualizarSchema.safeParse(corpo);

  if (!dados.success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const atual = await prisma.barbearia.findUnique({ where: { id }, select: { plano: true, acessoAte: true } });
  if (!atual) return NextResponse.json({ erro: "Barbearia não encontrada." }, { status: 404 });

  // Não deixa rebaixar o plano abaixo da equipe ativa que a barbearia já tem.
  if (dados.data.plano && dados.data.plano !== atual.plano) {
    const limite = LIMITE_PROFISSIONAIS[dados.data.plano];
    const ativos = await contarProfissionaisAtivos(prisma, id);
    if (limite !== null && ativos > limite) {
      return NextResponse.json(
        {
          erro: `Esta barbearia tem ${ativos} profissionais ativos e o plano ${ROTULO_PLANO[dados.data.plano]} comporta ${descreverLimite(dados.data.plano)}. O dono precisa desativar ${ativos - limite} antes da mudança.`,
        },
        { status: 409 },
      );
    }
  }

  const { acesso, ...resto } = dados.data;
  const barbearia = await prisma.barbearia.update({
    where: { id },
    data: {
      ...resto,
      ...(acesso
        ? "semPrazo" in acesso
          ? { acessoAte: null, emTeste: false }
          : { acessoAte: estenderAcesso(atual.acessoAte, acesso.meses), emTeste: false }
        : {}),
    },
  });

  return NextResponse.json({ barbearia });
}
