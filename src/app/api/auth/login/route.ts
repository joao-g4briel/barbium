import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verificarSenha, criarTokenSessao, COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const dados = loginSchema.safeParse(corpo);

  if (!dados.success) {
    return NextResponse.json(
      { erro: "Informe um e-mail e uma senha válidos." },
      { status: 400 },
    );
  }

  const { email, senha } = dados.data;

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !usuario.ativo) {
    return NextResponse.json(
      { erro: "E-mail ou senha incorretos." },
      { status: 401 },
    );
  }

  // Se o usuário pertence a uma barbearia, a barbearia também precisa
  // estar ativa — senão o próprio plano/acesso pode ter sido suspenso.
  if (usuario.barbeariaId) {
    const barbearia = await prisma.barbearia.findUnique({
      where: { id: usuario.barbeariaId },
      select: { ativo: true },
    });
    if (!barbearia?.ativo) {
      return NextResponse.json(
        { erro: "Esta barbearia está com o acesso suspenso." },
        { status: 403 },
      );
    }
  }

  const senhaConfere = await verificarSenha(senha, usuario.senhaHash);
  if (!senhaConfere) {
    return NextResponse.json(
      { erro: "E-mail ou senha incorretos." },
      { status: 401 },
    );
  }

  const token = await criarTokenSessao({
    sub: usuario.id,
    nome: usuario.nome,
    role: usuario.role,
    barbeariaId: usuario.barbeariaId,
  });

  const resposta = NextResponse.json({
    role: usuario.role,
    nome: usuario.nome,
  });

  resposta.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias, em segundos
  });

  return resposta;
}
