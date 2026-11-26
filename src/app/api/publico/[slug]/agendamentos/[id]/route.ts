import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { informarPixDoSinal, liberarSinaisExpirados, sincronizarSinal } from "@/lib/sinal";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao } from "@/lib/limite-tentativas";

// Consultada pela tela do Pix enquanto o cliente paga. Devolve só o estado do
// agendamento — nada de dados do cliente.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;

  const barbearia = await prisma.barbearia.findUnique({ where: { slug }, select: { id: true } });
  if (!barbearia) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const buscar = () =>
    prisma.agendamento.findFirst({
      where: { id, barbeariaId: barbearia.id },
      select: { status: true, sinalStatus: true, sinalPagamentoId: true, barbeariaId: true, sinalInformadoEm: true },
    });

  const agendamento = await buscar();
  if (!agendamento) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  if (agendamento.status === "AGUARDANDO_PAGAMENTO") {
    // Confere no Mercado Pago antes de expirar, pra não liberar um horário
    // que acabou de ser pago enquanto o webhook ainda não chegou.
    await sincronizarSinal(agendamento).catch(() => {});
    await liberarSinaisExpirados(barbearia.id);
  }

  const atual = await buscar();
  return NextResponse.json({
    status: atual?.status,
    sinalStatus: atual?.sinalStatus,
    informado: Boolean(atual?.sinalInformadoEm),
  });
}

// Pix pela chave: o cliente avisa que pagou. Não confirma nada sozinho (quem
// confirma é o dono, conferindo no banco); só tira o prazo do horário e avisa
// a barbearia. O id do agendamento só chega a quem acabou de agendar.
const corpoSchema = z.object({ acao: z.literal("pix-informado") });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  if (!corpoSchema.safeParse(await request.json().catch(() => null)).success) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const barbearia = await prisma.barbearia.findUnique({ where: { slug }, select: { id: true } });
  if (!barbearia) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });

  const permitido = await dentroDosLimites([
    { chave: `pix-informado:ip:${ipDaRequisicao(request)}`, maximo: 20, janelaSegundos: 60 * 60 },
  ]);
  if (!permitido) return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });

  // Prazo vencido antes do aviso: o horário já foi liberado.
  await liberarSinaisExpirados(barbearia.id);
  const ag = await prisma.agendamento.findFirst({
    where: { id, barbeariaId: barbearia.id },
    select: { status: true, sinalViaChave: true, sinalInformadoEm: true },
  });
  if (!ag || !ag.sinalViaChave) return NextResponse.json({ erro: "Não encontrado." }, { status: 404 });
  if (ag.status === "CANCELADO") {
    return NextResponse.json(
      { erro: "O prazo para pagar acabou e o horário foi liberado. Se você já pagou, fale com a barbearia." },
      { status: 409 },
    );
  }
  if (ag.status === "AGUARDANDO_PAGAMENTO" && !ag.sinalInformadoEm) await informarPixDoSinal(barbearia.id, id);
  return NextResponse.json({ ok: true });
}
