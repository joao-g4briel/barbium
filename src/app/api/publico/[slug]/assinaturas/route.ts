import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { acessoVencido } from "@/lib/acesso";
import { apenasDigitos, formatarDataInstante } from "@/lib/formatar";
import { obterOuCriarCliente } from "@/lib/cliente-por-telefone";
import { criarPixDaAssinatura, prepararAssinatura } from "@/lib/planos-corte";
import { obterTokenMercadoPago } from "@/lib/sinal";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao } from "@/lib/limite-tentativas";

// Assinar (ou renovar) um plano pela página de agendamento: gera o Pix de um
// mês na conta do Mercado Pago da barbearia. O plano só passa a valer quando
// o Pix é pago (webhook ou a consulta da tela do Pix).
const corpoSchema = z.object({
  planoId: z.string().min(1),
  telefone: z.string(),
  // Obrigatório só pra quem ainda não é cliente da barbearia.
  nome: z.string().trim().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  const telefone = apenasDigitos(dados.data.telefone);
  if (telefone.length < 10) return NextResponse.json({ erro: "Informe o WhatsApp com DDD." }, { status: 400 });

  const barbearia = await prisma.barbearia.findUnique({ where: { slug } });
  if (!barbearia || !barbearia.ativo || acessoVencido(barbearia)) {
    return NextResponse.json({ erro: "Barbearia não encontrada." }, { status: 404 });
  }
  const plano = await prisma.planoCorte.findUnique({ where: { id: dados.data.planoId } });
  if (!plano || plano.barbeariaId !== barbearia.id || !plano.ativo) {
    return NextResponse.json({ erro: "Plano não encontrado." }, { status: 404 });
  }
  if (!(await obterTokenMercadoPago(barbearia.id))) {
    return NextResponse.json({ erro: "Esta barbearia ainda não recebe pagamentos online. Fale com ela." }, { status: 409 });
  }

  const permitido = await dentroDosLimites([
    { chave: `assinar:ip:${ipDaRequisicao(request)}`, maximo: 10, janelaSegundos: 60 * 60 },
    { chave: `assinar:tel:${barbearia.id}:${telefone}`, maximo: 6, janelaSegundos: 24 * 60 * 60 },
  ]);
  if (!permitido) return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });

  const existente = await prisma.cliente.findUnique({
    where: { barbeariaId_telefone: { barbeariaId: barbearia.id, telefone } },
    select: { id: true, removidoEm: true },
  });
  const nome = dados.data.nome ?? "";
  if ((!existente || existente.removidoEm) && nome.length < 2) {
    return NextResponse.json({ erro: "Informe seu nome.", campo: "nome" }, { status: 400 });
  }

  const preparo = await prisma.$transaction(async (tx) => {
    const cliente = await obterOuCriarCliente(tx, { barbeariaId: barbearia.id, telefone, nome });
    return prepararAssinatura(tx, { barbeariaId: barbearia.id, clienteId: cliente.id, planoId: plano.id });
  });
  if (!preparo.ok) {
    return NextResponse.json(
      {
        erro: `Você já tem o plano ${preparo.planoAtual} ativo até ${formatarDataInstante(preparo.validaAte, { day: "2-digit", month: "2-digit" }, barbearia.fuso)}. Para trocar de plano, fale com a barbearia.`,
      },
      { status: 409 },
    );
  }

  try {
    const pix = await criarPixDaAssinatura({
      barbearia: { id: barbearia.id, nome: barbearia.nome },
      assinaturaId: preparo.assinaturaId,
      plano: { nome: plano.nome, valor: Number(plano.valor) },
      origem: new URL(request.url).origin,
    });
    return NextResponse.json({ pagamento: pix });
  } catch (erro) {
    console.error("Falha ao gerar Pix do plano:", erro instanceof Error ? erro.message : erro);
    return NextResponse.json({ erro: "Não foi possível gerar o Pix agora. Tente de novo em instantes." }, { status: 502 });
  }
}
