import "server-only";
import { prisma } from "./prisma";
import { formatarDataInstante, formatarTelefone, numeroWhatsApp } from "./formatar";
import { notificacoesConfiguradas, postarWebhook } from "./notificacoes";
import { emailConfigurado, enviarEmail } from "./email";
import { urlPublicaDoApp } from "./link-cliente";
import { WHATSAPP_VENDAS } from "./precos";
import { etapaDoAvisoDeTeste, JANELA_ACABANDO_MS, JANELA_FIM_MS, type EtapaAvisoTeste } from "./avisos-teste-regras";

// Avisos de fim do teste grátis ao dono: um quando faltam até 3 dias, outro
// quando o teste termina. Rodam uma vez por dia (Vercel Cron, ver vercel.json).
// Cada aviso é marcado antes de sair, então nunca vai repetido.

export interface ResultadoAvisosTeste {
  acabando: number;
  terminou: number;
  falhas: number;
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function montarAvisoDeTeste(
  etapa: EtapaAvisoTeste,
  dados: { nomeDono: string; barbearia: string; acessoAte: Date; linkAssinatura: string },
) {
  const primeiroNome = dados.nomeDono.trim().split(/\s+/)[0] || dados.nomeDono;
  const quando = formatarDataInstante(dados.acessoAte, { weekday: "long", day: "2-digit", month: "2-digit" }).toLowerCase();
  const contato = `https://wa.me/${WHATSAPP_VENDAS}`;
  if (etapa === "acabando") {
    const linhas = [
      `Olá, ${primeiroNome}!`,
      `O teste grátis do Barbium na ${dados.barbearia} termina ${quando}.`,
      "Para continuar com a agenda, o link de agendamento e o caixa sem interrupção, escolha seu plano:",
      dados.linkAssinatura,
      `Dúvidas? Fale com a gente: ${contato}`,
    ];
    return {
      whatsapp: [`⏳ *Seu teste grátis está acabando*`, "", ...linhas].join("\n"),
      assunto: `Seu teste grátis do Barbium termina ${quando}`,
      texto: linhas.join("\n\n"),
      botao: "Escolher meu plano",
      linhas,
    };
  }
  const linhas = [
    `Olá, ${primeiroNome}!`,
    `O teste grátis do Barbium na ${dados.barbearia} terminou. Agenda, clientes e caixa continuam guardados.`,
    "Assine para voltar a usar tudo de onde parou:",
    dados.linkAssinatura,
    `Dúvidas? Fale com a gente: ${contato}`,
  ];
  return {
    whatsapp: [`🔒 *Seu teste grátis terminou*`, "", ...linhas].join("\n"),
    assunto: "Seu teste grátis do Barbium terminou",
    texto: linhas.join("\n\n"),
    botao: "Assinar o Barbium",
    linhas,
  };
}

function htmlDoAviso(aviso: ReturnType<typeof montarAvisoDeTeste>, link: string): string {
  const paragrafos = aviso.linhas
    .filter((l) => l !== link && !l.startsWith("Dúvidas?"))
    .map((l) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escaparHtml(l)}</p>`)
    .join("");
  const duvidas = aviso.linhas.find((l) => l.startsWith("Dúvidas?")) ?? "";
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f7f5;font-family:Manrope,sans-serif;color:#0d1110">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#064e3b">barbium</p>
      ${paragrafos}
      <p style="margin:24px 0">
        <a href="${escaparHtml(link)}"
           style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">
          ${escaparHtml(aviso.botao)}
        </a>
      </p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#4b5650">${escaparHtml(duvidas)}</p>
    </div>
  </body>
</html>`;
}

export async function enviarAvisosDeTeste(agora = new Date()): Promise<ResultadoAvisosTeste> {
  const resultado: ResultadoAvisosTeste = { acabando: 0, terminou: 0, falhas: 0 };
  const base = urlPublicaDoApp();
  if (!base) throw new Error("APP_URL não configurada: o aviso precisa do link da assinatura.");
  const linkAssinatura = `${base}/painel/assinatura`;
  const whatsapp = notificacoesConfiguradas();
  const email = emailConfigurado();

  const candidatas = await prisma.barbearia.findMany({
    where: {
      ativo: true,
      emTeste: true,
      acessoAte: { gt: new Date(agora.getTime() - JANELA_FIM_MS), lte: new Date(agora.getTime() + JANELA_ACABANDO_MS) },
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
      telefoneAvisos: true,
      emTeste: true,
      acessoAte: true,
      avisoTesteAcabandoEm: true,
      avisoTesteFimEm: true,
      usuarios: { where: { role: "DONO", ativo: true }, select: { nome: true, email: true }, take: 1 },
    },
  });

  for (const b of candidatas) {
    const etapa = etapaDoAvisoDeTeste(b, agora);
    if (!etapa || !b.acessoAte) continue;
    const campo = etapa === "acabando" ? "avisoTesteAcabandoEm" : "avisoTesteFimEm";
    // Marca antes de enviar: se outra execução já marcou, não é com esta.
    const marcado = await prisma.barbearia.updateMany({ where: { id: b.id, [campo]: null }, data: { [campo]: agora } });
    if (marcado.count === 0) continue;

    const dono = b.usuarios[0];
    const aviso = montarAvisoDeTeste(etapa, {
      nomeDono: dono?.nome ?? b.nome,
      barbearia: b.nome,
      acessoAte: b.acessoAte,
      linkAssinatura,
    });
    const envios: Promise<void>[] = [];
    const para = numeroWhatsApp(b.telefoneAvisos ?? b.telefone ?? "");
    if (whatsapp && para) {
      envios.push(postarWebhook({ evento: `teste.${etapa}`, destinatario: "barbearia", para, mensagem: aviso.whatsapp }));
    }
    if (email && dono?.email) {
      envios.push(enviarEmail({ para: dono.email, assunto: aviso.assunto, texto: aviso.texto, html: htmlDoAviso(aviso, linkAssinatura) }));
    }
    // Quem opera a plataforma fica sabendo do fim do teste, pra oferecer o plano.
    const plataforma = numeroWhatsApp(process.env.PLATAFORMA_WHATSAPP ?? "");
    if (etapa === "terminou" && whatsapp && plataforma) {
      envios.push(
        postarWebhook({
          evento: "teste.terminou.plataforma",
          destinatario: "plataforma",
          para: plataforma,
          mensagem: [
            "🔔 *Teste grátis terminou*",
            "",
            `*Barbearia:* ${b.nome}`,
            `*Dono:* ${dono?.nome ?? "—"}`,
            `*WhatsApp:* ${para ? formatarTelefone(para) : "—"}`,
          ].join("\n"),
        }),
      );
    }

    const lote = await Promise.allSettled(envios);
    const falhou = lote.filter((r) => r.status === "rejected");
    for (const f of falhou) console.error(`Aviso de teste (${etapa}) ${b.id}:`, (f as PromiseRejectedResult).reason);
    if (falhou.length) resultado.falhas++;
    resultado[etapa]++;
  }
  return resultado;
}
