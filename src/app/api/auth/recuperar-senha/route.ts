import { NextResponse, after } from "next/server";
import { z } from "zod";
import { emailConfigurado } from "@/lib/email";
import { MENSAGEM_LIMITE, dentroDosLimites, ipDaRequisicao } from "@/lib/limite-tentativas";
import { processarPedidoDeRedefinicao, urlDoApp } from "@/lib/recuperacao-senha";

const corpoSchema = z.object({ email: z.string().trim().email() });

const INDISPONIVEL =
  "A recuperação de senha por e-mail ainda não está disponível. Fale com o dono da barbearia ou com o suporte do Barbium.";

// Sempre a mesma resposta, exista ou não a conta, e o trabalho (consulta,
// gravação, envio) acontece depois da resposta: nem a mensagem nem o tempo
// de resposta revelam quais e-mails têm cadastro.
export async function POST(request: Request) {
  if (!emailConfigurado()) return NextResponse.json({ erro: INDISPONIVEL }, { status: 503 });

  const dados = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Informe um e-mail válido." }, { status: 400 });

  const urlBase = urlDoApp(new URL(request.url).origin);
  if (!urlBase) {
    console.error("Recuperação de senha: APP_URL não configurada em produção.");
    return NextResponse.json({ erro: INDISPONIVEL }, { status: 503 });
  }

  const email = dados.data.email;

  // Sem isso, dá pra usar o formulário pra encher a caixa de alguém de e-mail
  // (e gastar a cota do Resend). O limite vale exista ou não a conta.
  const permitido = await dentroDosLimites([
    { chave: `recuperar:email:${email.toLowerCase()}`, maximo: 3, janelaSegundos: 60 * 60 },
    { chave: `recuperar:ip:${ipDaRequisicao(request)}`, maximo: 10, janelaSegundos: 60 * 60 },
  ]);
  if (!permitido) return NextResponse.json({ erro: MENSAGEM_LIMITE }, { status: 429 });
  after(async () => {
    try {
      await processarPedidoDeRedefinicao(email, urlBase);
    } catch (erro) {
      console.error("Recuperação de senha:", erro instanceof Error ? erro.message : erro);
    }
  });

  return NextResponse.json({ ok: true });
}
