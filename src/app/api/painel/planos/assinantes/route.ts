import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { obterOuCriarCliente } from "@/lib/cliente-por-telefone";
import { prepararAssinatura, registrarPagamentoNoBalcao } from "@/lib/planos-corte";
import { apenasDigitos, formatarDataInstante } from "@/lib/formatar";

// O dono põe um cliente num plano e registra o primeiro mês, pago no balcão.
// O cliente vem da ficha (clienteId) ou é achado/cadastrado pelo telefone.
const corpoSchema = z
  .object({
    planoId: z.string().min(1),
    formaPagamento: z.enum(["PIX", "DINHEIRO", "DEBITO", "CREDITO"]),
    clienteId: z.string().min(1).optional(),
    nome: z.string().trim().optional(),
    telefone: z.string().optional(),
  })
  .refine((d) => d.clienteId || (d.nome && d.nome.length >= 2 && apenasDigitos(d.telefone ?? "").length >= 10), {
    message: "Informe o nome e o WhatsApp do cliente, com DDD.",
  });

export async function POST(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  if (sessao.role !== "DONO") {
    return NextResponse.json({ erro: "Só o dono da barbearia pode gerenciar assinantes." }, { status: 403 });
  }
  const barbeariaId = sessao.barbeariaId!;

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json({ erro: dados.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const plano = await prisma.planoCorte.findUnique({ where: { id: dados.data.planoId } });
  if (!plano || plano.barbeariaId !== barbeariaId) {
    return NextResponse.json({ erro: "Plano não encontrado." }, { status: 404 });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    let clienteId = dados.data.clienteId;
    if (clienteId) {
      const cliente = await tx.cliente.findUnique({ where: { id: clienteId }, select: { barbeariaId: true, removidoEm: true } });
      if (!cliente || cliente.barbeariaId !== barbeariaId || cliente.removidoEm) return { erro: "Cliente não encontrado.", status: 404 };
    } else {
      const cliente = await obterOuCriarCliente(tx, {
        barbeariaId,
        telefone: apenasDigitos(dados.data.telefone!),
        nome: dados.data.nome!,
      });
      if (cliente.removidoEm) return { erro: "Esse telefone é de um cliente excluído.", status: 409 };
      clienteId = cliente.id;
    }

    const preparo = await prepararAssinatura(tx, { barbeariaId, clienteId, planoId: plano.id });
    if (!preparo.ok) {
      return {
        erro: `Esse cliente já tem o plano ${preparo.planoAtual} ativo até ${formatarDataInstante(preparo.validaAte, { day: "2-digit", month: "2-digit" }, sessao.fuso)}. Encerre essa assinatura antes de trocar de plano.`,
        status: 409,
      };
    }
    const validaAte = await registrarPagamentoNoBalcao(tx, {
      barbeariaId,
      assinaturaId: preparo.assinaturaId,
      valor: Number(plano.valor),
      formaPagamento: dados.data.formaPagamento,
    });
    return { assinaturaId: preparo.assinaturaId, validaAte, clienteId };
  });

  if ("erro" in resultado) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
  return NextResponse.json(resultado);
}
