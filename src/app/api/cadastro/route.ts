import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, OPCOES_COOKIE_SESSAO, criarTokenSessao, hashSenha } from "@/lib/auth";
import { cadastroSchema, fimDoTeste, slugDisponivel } from "@/lib/cadastro";
import { criarExpedientePadrao } from "@/lib/equipe";
import { ehViolacaoDeUnicidade } from "@/lib/erros-banco";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao } from "@/lib/limite-tentativas";
import { apenasDigitos, formatarTelefone, numeroWhatsApp } from "@/lib/formatar";
import { notificacoesConfiguradas, postarWebhook } from "@/lib/notificacoes";
import { ROTULO_PLANO } from "@/lib/planos";
import { DIAS_TESTE } from "@/lib/precos";

// Cadastro de barbearia pelo site (landing → /cadastro). Cria a barbearia em
// teste grátis e o dono, e já devolve a sessão: a pessoa cai direto no painel.

export async function POST(request: Request) {
  const ip = ipDaRequisicao(request);
  // Segura cadastro em massa: poucos por lugar por hora, e um teto geral.
  const permitido = await dentroDosLimites([
    { chave: `cadastro:ip:${ip}`, maximo: 5, janelaSegundos: 60 * 60 },
    { chave: "cadastro:geral", maximo: 200, janelaSegundos: 60 * 60 },
  ]);
  if (!permitido) return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });

  const dados = cadastroSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) {
    const campo = dados.error.issues[0];
    // Robô preencheu o campo escondido: responde como se nada tivesse acontecido.
    if (campo?.path[0] === "site") return NextResponse.json({ erro: "Não foi possível concluir o cadastro." }, { status: 400 });
    return NextResponse.json({ erro: campo?.message ?? "Dados inválidos.", campo: campo?.path[0] }, { status: 400 });
  }
  const { nomeBarbearia, nome, email, whatsapp, senha, plano } = dados.data;

  const emailEmUso = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (emailEmUso) {
    return NextResponse.json(
      { erro: "Já existe uma conta com esse e-mail. Entre com ele ou use outro.", campo: "email" },
      { status: 409 },
    );
  }

  const senhaHash = await hashSenha(senha);
  const telefone = apenasDigitos(whatsapp);
  const acessoAte = fimDoTeste();

  let criado: { barbeariaId: string; usuarioId: string; slug: string };
  try {
    criado = await prisma.$transaction(async (tx) => {
      const slug = await slugDisponivel(tx, nomeBarbearia);
      const barbearia = await tx.barbearia.create({
        data: { nome: nomeBarbearia, slug, telefone, telefoneAvisos: telefone, plano, acessoAte, emTeste: true },
      });
      const dono = await tx.usuario.create({
        data: { nome, email, senhaHash, role: "DONO", barbeariaId: barbearia.id },
      });
      await criarExpedientePadrao(tx, dono.id);
      return { barbeariaId: barbearia.id, usuarioId: dono.id, slug };
    });
  } catch (erro) {
    // E-mail ou link pegos por outro cadastro no mesmo instante.
    if (ehViolacaoDeUnicidade(erro)) {
      return NextResponse.json({ erro: "Não foi possível concluir agora. Tente de novo." }, { status: 409 });
    }
    throw erro;
  }

  // Avisa quem opera a plataforma, pra acompanhar o teste (mesmo número dos alertas).
  const para = numeroWhatsApp(process.env.PLATAFORMA_WHATSAPP ?? "");
  if (para && notificacoesConfiguradas()) {
    after(() =>
      postarWebhook({
        evento: "barbearia.cadastrada",
        destinatario: "plataforma",
        para,
        mensagem: [
          "🎉 *Nova barbearia em teste*",
          "",
          `*Barbearia:* ${nomeBarbearia}`,
          `*Dono:* ${nome}`,
          `*WhatsApp:* ${formatarTelefone(telefone)}`,
          `*E-mail:* ${email}`,
          `*Plano:* ${ROTULO_PLANO[plano]}`,
          `*Teste até:* ${DIAS_TESTE} dias a partir de hoje`,
        ].join("\n"),
      }).catch((e) => console.error("Aviso de cadastro:", e instanceof Error ? e.message : e)),
    );
  }

  const token = await criarTokenSessao({ sub: criado.usuarioId, nome, role: "DONO", barbeariaId: criado.barbeariaId });
  const resposta = NextResponse.json({ ok: true, slug: criado.slug });
  resposta.cookies.set(COOKIE_NAME, token, OPCOES_COOKIE_SESSAO);
  return resposta;
}
