import "server-only";
import { prisma } from "./prisma";
import { dentroDaJanelaDeLembrete } from "./lembrete-opcoes";
import {
  INCLUIR_NOTIFICACAO,
  corpoDoWebhook,
  dadosDaMensagem,
  montarMensagemCliente,
  postarWebhook,
  quandoRelativo,
  whatsappDoCliente,
} from "./notificacoes";

// Lembrete no WhatsApp do cliente, X horas antes do horário (X escolhido por
// cada barbearia nas Configurações). Quem chama é o n8n, a cada 15 minutos,
// pela rota /api/lembretes: aqui só se manda o que já está na hora.
//
// Cada agendamento recebe no máximo um lembrete: antes de enviar, ele é
// marcado (lembreteEnviadoEm) de forma atômica. Se duas chamadas rodarem
// juntas, só uma consegue marcar. Se o envio falhar, o lembrete daquele
// horário se perde (melhor do que mandar repetido).

// Faltando menos que isso pro horário, o lembrete já não ajuda.
const ANTECEDENCIA_MINIMA_MS = 10 * 60 * 1000;
// Teto por chamada, pra rota responder dentro do limite de tempo da Vercel.
// O que sobrar vai na chamada seguinte, 15 minutos depois.
const MAXIMO_POR_CHAMADA = 60;
const ENVIOS_SIMULTANEOS = 10;

export interface ResultadoLembretes {
  enviados: number;
  // Tratados sem envio: cliente sem WhatsApp ou que pediu pra não receber, ou
  // agendamento marcado quando o lembrete já não fazia sentido.
  dispensados: number;
  falhas: number;
}

export async function enviarLembretesPendentes(agora = new Date()): Promise<ResultadoLembretes> {
  const resultado: ResultadoLembretes = { enviados: 0, dispensados: 0, falhas: 0 };

  const barbearias = await prisma.barbearia.findMany({
    // Barbearia com o teste ou a assinatura vencidos não manda lembrete, nem
    // a que já saiu do teste sem o adicional de WhatsApp (lib/whatsapp-adicional).
    where: {
      ativo: true,
      lembreteHorasAntes: { not: null },
      AND: [
        { OR: [{ acessoAte: null }, { acessoAte: { gt: agora } }] },
        { OR: [{ whatsappAtivo: true }, { emTeste: true }] },
      ],
    },
    select: { id: true, lembreteHorasAntes: true },
  });

  let restantes = MAXIMO_POR_CHAMADA;
  for (const barbearia of barbearias) {
    if (restantes <= 0) break;
    const horas = barbearia.lembreteHorasAntes!;

    const pendentes = await prisma.agendamento.findMany({
      where: {
        barbeariaId: barbearia.id,
        status: "CONFIRMADO",
        lembreteEnviadoEm: null,
        inicio: {
          gt: new Date(agora.getTime() + ANTECEDENCIA_MINIMA_MS),
          lte: new Date(agora.getTime() + horas * 60 * 60 * 1000),
        },
      },
      include: INCLUIR_NOTIFICACAO,
      orderBy: { inicio: "asc" },
      take: restantes,
    });
    restantes -= pendentes.length;

    const envios: (() => Promise<void>)[] = [];
    for (const ag of pendentes) {
      // Marca antes de enviar. Se outra chamada já marcou, não é com esta.
      const marcado = await prisma.agendamento.updateMany({
        where: { id: ag.id, lembreteEnviadoEm: null },
        data: { lembreteEnviadoEm: agora },
      });
      if (marcado.count === 0) continue;

      const para = whatsappDoCliente(ag);
      // Marcado já dentro da janela: o cliente acabou de receber a confirmação.
      const marcadoEmCimaDaHora = dentroDaJanelaDeLembrete(ag.inicio, horas, ag.criadoEm);
      if (!para || marcadoEmCimaDaHora) {
        resultado.dispensados++;
        continue;
      }

      const dados = dadosDaMensagem(ag);
      dados.quando = quandoRelativo(ag.inicio, agora, dados.quando);
      envios.push(() =>
        postarWebhook({
          ...corpoDoWebhook("agendamento.lembrete", ag, dados),
          destinatario: "cliente",
          para,
          mensagem: montarMensagemCliente(dados, "agendamento.lembrete"),
        }),
      );
    }

    for (let i = 0; i < envios.length; i += ENVIOS_SIMULTANEOS) {
      const lote = await Promise.allSettled(envios.slice(i, i + ENVIOS_SIMULTANEOS).map((enviar) => enviar()));
      for (const r of lote) {
        if (r.status === "fulfilled") resultado.enviados++;
        else {
          resultado.falhas++;
          console.error("Lembrete:", r.reason instanceof Error ? r.reason.message : r.reason);
        }
      }
    }
  }

  return resultado;
}
