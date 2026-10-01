import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioDaBarbearia } from "@/lib/sessao";
import { COOKIE_NAME, OPCOES_COOKIE_SESSAO, criarTokenSessao, hashSenha, verificarSenha } from "@/lib/auth";
import { SENHA_MINIMO } from "@/lib/senha";

const corpoSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(SENHA_MINIMO),
});

// Troca de senha pedindo a atual — quem pegar o aparelho logado não
// consegue trancar o dono fora da conta.
export async function POST(request: Request) {
  const sessao = await exigirUsuarioDaBarbearia().catch(() => null);
  if (!sessao) return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json(
      { erro: `A nova senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.` },
      { status: 400 },
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.sub }, select: { senhaHash: true } });
  if (!usuario || !(await verificarSenha(dados.data.senhaAtual, usuario.senhaHash))) {
    return NextResponse.json({ erro: "A senha atual não confere." }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: sessao.sub },
    data: { senhaHash: await hashSenha(dados.data.novaSenha), senhaAlteradaEm: new Date() },
  });

  // As sessões antigas (outros aparelhos) caem; esta recebe um token novo
  // pra quem acabou de trocar a senha continuar logado.
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(
    COOKIE_NAME,
    await criarTokenSessao({ sub: sessao.sub, nome: sessao.nome, role: sessao.role, barbeariaId: sessao.barbeariaId }),
    OPCOES_COOKIE_SESSAO,
  );
  return resposta;
}
