import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contarProfissionaisAtivos, dadosProfissionalSchema, exigirDono, mensagemValidacao } from "@/lib/equipe";
import { cabeMaisUm, mensagemLimite } from "@/lib/planos";

const corpoSchema = dadosProfissionalSchema.extend({ ativo: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode editar a equipe." }, { status: 403 });
  const { id } = await params;

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: mensagemValidacao(dados.error) }, { status: 400 });

  const profissional = await prisma.usuario.findUnique({ where: { id } });
  if (!profissional || profissional.barbeariaId !== sessao.barbeariaId) {
    return NextResponse.json({ erro: "Profissional não encontrado." }, { status: 404 });
  }

  // O dono não se desativa (ficaria sem acesso à própria barbearia).
  if (!dados.data.ativo && profissional.role === "DONO") {
    return NextResponse.json({ erro: "O dono da barbearia não pode ser desativado." }, { status: 400 });
  }

  // Reativar ocupa uma vaga do plano.
  if (dados.data.ativo && !profissional.ativo) {
    const barbearia = await prisma.barbearia.findUnique({ where: { id: sessao.barbeariaId! }, select: { plano: true } });
    const plano = barbearia?.plano ?? "SOLO";
    if (!cabeMaisUm(plano, await contarProfissionaisAtivos(prisma, sessao.barbeariaId!))) {
      return NextResponse.json({ erro: mensagemLimite(plano), codigo: "LIMITE_PLANO" }, { status: 409 });
    }
  }

  if (dados.data.email !== profissional.email) {
    const emailEmUso = await prisma.usuario.findUnique({ where: { email: dados.data.email } });
    if (emailEmUso) return NextResponse.json({ erro: "Já existe um usuário com esse e-mail." }, { status: 409 });
  }

  await prisma.usuario.update({
    where: { id },
    data: {
      nome: dados.data.nome,
      email: dados.data.email,
      comissaoPercentual: dados.data.comissaoPercentual,
      ativo: dados.data.ativo,
    },
  });

  return NextResponse.json({ ok: true });
}
