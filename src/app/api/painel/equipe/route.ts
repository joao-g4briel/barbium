import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarSenhaTemporaria, hashSenha } from "@/lib/auth";
import {
  contarProfissionaisAtivos,
  criarExpedientePadrao,
  dadosProfissionalSchema,
  exigirDono,
  mensagemValidacao,
} from "@/lib/equipe";
import { cabeMaisUm, mensagemLimite } from "@/lib/planos";

// Cadastra um barbeiro na barbearia do dono. A senha temporária só aparece
// nesta resposta — o dono repassa e o barbeiro troca no primeiro acesso.
export async function POST(request: Request) {
  const sessao = await exigirDono();
  if (!sessao) return NextResponse.json({ erro: "Só o dono pode cadastrar profissionais." }, { status: 403 });

  const dados = dadosProfissionalSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: mensagemValidacao(dados.error) }, { status: 400 });

  const emailEmUso = await prisma.usuario.findUnique({ where: { email: dados.data.email } });
  if (emailEmUso) return NextResponse.json({ erro: "Já existe um usuário com esse e-mail." }, { status: 409 });

  const senhaTemporaria = gerarSenhaTemporaria();
  const senhaHash = await hashSenha(senhaTemporaria);

  const barbearia = await prisma.barbearia.findUnique({
    where: { id: sessao.barbeariaId! },
    select: { plano: true },
  });
  const plano = barbearia?.plano ?? "SOLO";

  const profissional = await prisma.$transaction(async (tx) => {
    if (!cabeMaisUm(plano, await contarProfissionaisAtivos(tx, sessao.barbeariaId!))) return null;
    const usuario = await tx.usuario.create({
      data: {
        nome: dados.data.nome,
        email: dados.data.email,
        senhaHash,
        role: "BARBEIRO",
        barbeariaId: sessao.barbeariaId!,
        comissaoPercentual: dados.data.comissaoPercentual,
      },
    });
    await criarExpedientePadrao(tx, usuario.id);
    return usuario;
  });

  if (!profissional) {
    return NextResponse.json({ erro: mensagemLimite(plano), codigo: "LIMITE_PLANO" }, { status: 409 });
  }

  return NextResponse.json({
    profissional: { id: profissional.id, nome: profissional.nome, email: profissional.email },
    senhaTemporaria,
  });
}
