import "server-only";
import { prisma } from "./prisma";
import { notificacoesConfiguradas, postarWebhook } from "./notificacoes";
import { numeroWhatsApp, formatarDataInstante } from "./formatar";
import { linkDaAssinatura, linkParaAgendar } from "./link-cliente";
import { montarAvisoRenovacao } from "./avisos-plano-texto";

// "Seu plano vence em breve" no WhatsApp do assinante. Sai uma vez por mês de
// plano (avisoRenovacaoEm, que zera a cada mês pago), nos últimos dias antes
// do vencimento. Quem renova sozinho no cartão não recebe: não há o que fazer.
// Quem chama é a rota dos lembretes, a cada 15 minutos.

const DIAS_ANTES = 3;
const MAXIMO_POR_CHAMADA = 40;

export async function enviarAvisosDeRenovacao(agora = new Date()): Promise<{ enviados: number; dispensados: number; falhas: number }> {
  const resultado = { enviados: 0, dispensados: 0, falhas: 0 };
  if (!notificacoesConfiguradas()) return resultado;

  const assinaturas = await prisma.assinaturaPlano.findMany({
    where: {
      canceladaEm: null,
      avisoRenovacaoEm: null,
      validaAte: { gt: agora, lte: new Date(agora.getTime() + DIAS_ANTES * 24 * 60 * 60 * 1000) },
      // Sem cartão (Pix ou balcão) o campo é vazio, e "diferente de" no SQL
      // deixaria esses de fora: por isso o OR explícito com o vazio.
      OR: [{ cartaoStatus: null }, { cartaoStatus: { not: "authorized" } }],
      // Mesma regra das outras mensagens (lib/whatsapp-adicional).
      barbearia: {
        ativo: true,
        AND: [
          { OR: [{ acessoAte: null }, { acessoAte: { gt: agora } }] },
          { OR: [{ whatsappAtivo: true }, { emTeste: true }] },
        ],
      },
    },
    include: {
      cliente: { select: { nome: true, telefone: true, aceitaMensagens: true, removidoEm: true } },
      plano: { select: { nome: true } },
      barbearia: { select: { id: true, nome: true, slug: true, fuso: true } },
    },
    orderBy: { validaAte: "asc" },
    take: MAXIMO_POR_CHAMADA,
  });

  for (const a of assinaturas) {
    // Marca antes de enviar: duas chamadas juntas não mandam repetido.
    const marcado = await prisma.assinaturaPlano.updateMany({
      where: { id: a.id, avisoRenovacaoEm: null },
      data: { avisoRenovacaoEm: agora },
    });
    if (marcado.count === 0) continue;

    const para = a.cliente.aceitaMensagens && !a.cliente.removidoEm ? numeroWhatsApp(a.cliente.telefone) : null;
    if (!para || !a.validaAte) {
      resultado.dispensados++;
      continue;
    }

    const mensagem = montarAvisoRenovacao({
      cliente: a.cliente.nome,
      plano: a.plano.nome,
      barbearia: a.barbearia.nome,
      vence: formatarDataInstante(a.validaAte, { weekday: "long", day: "2-digit", month: "2-digit" }, a.barbearia.fuso),
      link: linkDaAssinatura(a.id) ?? linkParaAgendar(a.barbearia.slug),
      cartaoCancelado: a.cartaoStatus === "cancelled",
    });
    try {
      await postarWebhook({
        evento: "plano.renovacao",
        barbearia: { id: a.barbearia.id, nome: a.barbearia.nome, slug: a.barbearia.slug },
        assinatura: { id: a.id, plano: a.plano.nome, validaAte: a.validaAte.toISOString() },
        destinatario: "cliente",
        para,
        mensagem,
      });
      resultado.enviados++;
    } catch (erro) {
      resultado.falhas++;
      console.error("Aviso de renovação:", erro instanceof Error ? erro.message : erro);
    }
  }
  return resultado;
}
