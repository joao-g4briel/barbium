import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { estenderAcesso } from "./acesso";
import { contarProfissionaisAtivos } from "./equipe";
import { LIMITE_PROFISSIONAIS, ROTULO_PLANO } from "./planos";
import { ROTULO_PERIODO_ASSINATURA } from "./precos";
import { formatarDataInstante, formatarMoeda, numeroWhatsApp } from "./formatar";
import { notificacoesConfiguradas, postarWebhook } from "./notificacoes";
import { enviarEventoMeta, metaConfigurada } from "./meta-capi";
import { EVENTOS_ALERTA, EVENTOS_PAGOS, ofertaDoPedido, pedidosDoEvento, type EventoCakto, type PedidoCakto } from "./cakto-regras";

// Liberação automática pelo webhook da Cakto. Pagamento confirmado da
// assinatura: estende o acesso pelo período e ajusta o plano. Order bump
// (adicional de WhatsApp): liga o WhatsApp. Reembolso, chargeback e
// cancelamento não tiram nada sozinhos: avisam a plataforma para decidir.
// Barbearia: pelo "sck" que vai no link de assinar do painel; sem ele, pelo
// e-mail do dono. Cada pedido é registrado e nunca processado duas vezes.

export interface ResultadoCakto {
  pedido: string;
  resultado: string;
}

async function avisarPlataforma(mensagem: string) {
  const para = numeroWhatsApp(process.env.PLATAFORMA_WHATSAPP ?? "");
  if (!para || !notificacoesConfiguradas()) return;
  await postarWebhook({ evento: "cakto.plataforma", destinatario: "plataforma", para, mensagem }).catch((e) =>
    console.error("Aviso Cakto à plataforma:", e),
  );
}

async function barbeariaDoPedido(pedido: PedidoCakto) {
  const selecao = {
    id: true,
    nome: true,
    plano: true,
    acessoAte: true,
    emTeste: true,
    telefone: true,
    telefoneAvisos: true,
  } satisfies Prisma.BarbeariaSelect;
  if (pedido.sck) {
    const porSck = await prisma.barbearia.findUnique({ where: { id: pedido.sck }, select: selecao });
    if (porSck) return porSck;
  }
  const email = pedido.customer?.email?.trim().toLowerCase();
  if (!email) return null;
  const dono = await prisma.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, role: "DONO" },
    select: { barbearia: { select: selecao } },
  });
  return dono?.barbearia ?? null;
}

// Grava o pedido junto com a mudança na barbearia (na mesma transação);
// false se ele já tinha sido processado.
async function registrar(
  id: string,
  dados: Omit<Prisma.PagamentoCaktoUncheckedCreateInput, "id">,
  mudanca?: { barbeariaId: string; data: Prisma.BarbeariaUpdateInput },
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.pagamentoCakto.create({ data: { id, ...dados } });
      if (mudanca) await tx.barbearia.update({ where: { id: mudanca.barbeariaId }, data: mudanca.data });
    });
    return true;
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") return false;
    throw erro;
  }
}

async function processarPedido(evento: string, pedido: PedidoCakto): Promise<ResultadoCakto> {
  const idPedido = pedido.id ?? "";
  if (!idPedido) return { pedido: "?", resultado: "sem id do pedido" };
  const barbearia = await barbeariaDoPedido(pedido);
  const base = {
    evento,
    barbeariaId: barbearia?.id ?? null,
    ofertaId: pedido.offer?.id ?? null,
    tipoOferta: pedido.offer_type ?? null,
    valor: typeof pedido.amount === "number" ? new Prisma.Decimal(pedido.amount) : null,
    email: pedido.customer?.email ?? null,
  };
  const valor = typeof pedido.amount === "number" ? formatarMoeda(pedido.amount) : "—";

  if (EVENTOS_ALERTA.has(evento)) {
    if (!(await registrar(`${evento}:${idPedido}`, { ...base, resultado: "alerta" }))) return { pedido: idPedido, resultado: "repetido" };
    await avisarPlataforma(
      [
        `⚠️ *Cakto: ${evento}*`,
        "",
        `*Barbearia:* ${barbearia?.nome ?? "não encontrada"}`,
        `*Cliente:* ${pedido.customer?.email ?? "—"}`,
        `*Oferta:* ${pedido.offer?.name ?? pedido.product?.name ?? "—"} · ${valor}`,
        "Nada foi alterado no acesso. Confira e ajuste no super admin, se for o caso.",
      ].join("\n"),
    );
    return { pedido: idPedido, resultado: "alerta" };
  }

  if (!EVENTOS_PAGOS.has(evento)) return { pedido: idPedido, resultado: "ignorado" };
  if (pedido.status && pedido.status !== "paid") return { pedido: idPedido, resultado: `status ${pedido.status}` };

  // Mesmo pedido em purchase_approved e subscription_renewed: só uma liberação.
  const chave = `pago:${idPedido}`;
  if (!barbearia) {
    if (await registrar(chave, { ...base, resultado: "sem barbearia" })) {
      await avisarPlataforma(
        [
          "❓ *Pagamento na Cakto sem barbearia*",
          "",
          `*Cliente:* ${pedido.customer?.name ?? "—"} · ${pedido.customer?.email ?? "—"}`,
          `*Oferta:* ${pedido.offer?.name ?? pedido.product?.name ?? "—"} · ${valor}`,
          "Nenhuma barbearia com esse e-mail de dono. Libere à mão no super admin.",
        ].join("\n"),
      );
    }
    return { pedido: idPedido, resultado: "sem barbearia" };
  }

  // Order bump: o adicional de WhatsApp.
  if (pedido.offer_type === "orderbump") {
    if (!(await registrar(chave, { ...base, resultado: "whatsapp ligado" }, { barbeariaId: barbearia.id, data: { whatsappAtivo: true } }))) {
      return { pedido: idPedido, resultado: "repetido" };
    }
    await avisarPlataforma(`💬 *Adicional de WhatsApp pago*\n\n*Barbearia:* ${barbearia.nome}\nWhatsApp ligado automaticamente.`);
    return { pedido: idPedido, resultado: "whatsapp ligado" };
  }

  const oferta = ofertaDoPedido(pedido);
  if (!oferta) {
    if (await registrar(chave, { ...base, resultado: "oferta desconhecida" })) {
      await avisarPlataforma(
        `❓ *Pagamento na Cakto com oferta desconhecida*\n\n*Barbearia:* ${barbearia.nome}\n*Oferta:* ${pedido.offer?.id ?? "—"} · ${valor}\nLibere à mão no super admin.`,
      );
    }
    return { pedido: idPedido, resultado: "oferta desconhecida" };
  }

  // Plano: troca se a equipe ativa cabe no novo; senão mantém e avisa.
  let plano = barbearia.plano;
  let avisoPlano = "";
  if (oferta.plano !== barbearia.plano) {
    const limite = LIMITE_PROFISSIONAIS[oferta.plano];
    const ativos = await contarProfissionaisAtivos(prisma, barbearia.id);
    if (limite === null || ativos <= limite) plano = oferta.plano;
    else avisoPlano = `Plano mantido em ${ROTULO_PLANO[barbearia.plano]}: a equipe tem ${ativos} profissionais ativos.`;
  }
  // Barbearia sem prazo (antiga) continua sem prazo.
  const semPrazo = barbearia.acessoAte === null && !barbearia.emTeste;
  const novoPrazo = semPrazo ? null : estenderAcesso(barbearia.acessoAte, oferta.meses);

  const liberou = await registrar(
    chave,
    { ...base, resultado: `liberado ${oferta.plano} ${oferta.periodo}` },
    { barbeariaId: barbearia.id, data: { plano, emTeste: false, ...(semPrazo ? {} : { acessoAte: novoPrazo }) } },
  );
  if (!liberou) return { pedido: idPedido, resultado: "repetido" };

  // Venda pra Meta (API de Conversões): o pagamento é na Cakto, fora do site,
  // então só o servidor consegue avisar. Primeira compra = Purchase;
  // renovação = Subscribe (não conta como venda nova nos anúncios).
  if (metaConfigurada() && typeof pedido.amount === "number") {
    await enviarEventoMeta({
      nome: evento === "subscription_renewed" ? "Subscribe" : "Purchase",
      eventId: `purchase-${idPedido}`,
      origem: "system_generated",
      email: pedido.customer?.email,
      telefone: pedido.customer?.phone ?? barbearia.telefone,
      nome_pessoa: pedido.customer?.name,
      idExterno: barbearia.id,
      valor: pedido.amount,
    }).catch((e) => console.error("Meta CAPI (Purchase):", e instanceof Error ? e.message : e));
  }

  const ate = novoPrazo ? formatarDataInstante(novoPrazo, { day: "2-digit", month: "2-digit", year: "numeric" }) : "sem prazo";
  const paraDono = numeroWhatsApp(barbearia.telefoneAvisos ?? barbearia.telefone ?? "");
  if (paraDono && notificacoesConfiguradas()) {
    await postarWebhook({
      evento: "cakto.liberado",
      destinatario: "barbearia",
      para: paraDono,
      mensagem: [
        "✅ *Pagamento confirmado*",
        "",
        `Sua assinatura do Barbium (${ROTULO_PLANO[plano]}, ${ROTULO_PERIODO_ASSINATURA[oferta.periodo].toLowerCase()}) está ativa.`,
        `Acesso liberado até ${ate}. Obrigado!`,
      ].join("\n"),
    }).catch((e) => console.error("Aviso de liberação ao dono:", e));
  }
  await avisarPlataforma(
    [
      "💰 *Pagamento confirmado na Cakto*",
      "",
      `*Barbearia:* ${barbearia.nome}`,
      `*Plano:* ${ROTULO_PLANO[oferta.plano]} · ${ROTULO_PERIODO_ASSINATURA[oferta.periodo]} · ${valor}`,
      `*Acesso até:* ${ate}`,
      ...(avisoPlano ? ["", avisoPlano] : []),
    ].join("\n"),
  );
  return { pedido: idPedido, resultado: `liberado até ${ate}` };
}

export async function processarEventoCakto(evento: EventoCakto): Promise<ResultadoCakto[]> {
  const nome = evento.event ?? "";
  const resultados: ResultadoCakto[] = [];
  for (const pedido of pedidosDoEvento(evento)) {
    resultados.push(await processarPedido(nome, pedido));
  }
  return resultados;
}
