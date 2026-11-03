import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verificarSenha, criarTokenSessao, COOKIE_NAME, OPCOES_COOKIE_SESSAO } from "@/lib/auth";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao, zerarTentativas } from "@/lib/limite-tentativas";

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

  // Freia força bruta: poucas tentativas por e-mail vindas do mesmo lugar, um
  // teto por e-mail (ataque espalhado em vários IPs) e um teto por IP (um
  // lugar testando vários e-mails). Login certo zera o contador desse par.
  const ip = ipDaRequisicao(request);
  const chaveEmailIp = `login:${email.toLowerCase()}:${ip}`;
  const permitido = await dentroDosLimites([
    { chave: chaveEmailIp, maximo: 5, janelaSegundos: 15 * 60 },
    { chave: `login:email:${email.toLowerCase()}`, maximo: 20, janelaSegundos: 60 * 60 },
    { chave: `login:ip:${ip}`, maximo: 30, janelaSegundos: 15 * 60 },
  ]);
  if (!permitido) {
    return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });
  }

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

  await zerarTentativas(chaveEmailIp);

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

  resposta.cookies.set(COOKIE_NAME, token, OPCOES_COOKIE_SESSAO);

  return resposta;
}
