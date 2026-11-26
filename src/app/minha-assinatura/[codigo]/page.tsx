import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimboloBarbium } from "@/components/ui/marca";
import { CabecalhoBarbearia } from "@/components/publico/cabecalho-barbearia";
import { TemaDaBarbearia } from "@/components/tema-barbearia";
import { prisma } from "@/lib/prisma";
import { meiosDeRecebimento } from "@/lib/sinal";
import { assinaturaDoCodigo } from "@/lib/link-cliente";
import { sincronizarCartao, usosNoMes } from "@/lib/planos-corte";
import { mesDoPlano, situacaoAssinatura } from "@/lib/planos-corte-regras";
import { linkWhatsApp } from "@/lib/formatar";
import { ProvedorFuso } from "@/components/fuso-contexto";
import { ianaDoFuso } from "@/lib/fusos";
import { GerenciarAssinatura } from "./gerenciar-assinatura";

// Página da assinatura do plano de corte, sem login: o código no endereço é o
// que dá acesso (lib/link-cliente). O cliente chega aqui ao voltar do
// pagamento no cartão, pelo link guardado depois do Pix ou pelo aviso de
// renovação no WhatsApp. Não mostra nome nem telefone.

export const metadata: Metadata = {
  title: "Sua assinatura",
  robots: { index: false, follow: false },
  // Link pessoal do cliente: prévia neutra, sem a imagem de propaganda do
  // Barbium (o openGraph daqui substitui o do layout por inteiro).
  openGraph: { title: "Sua assinatura", description: "Veja e gerencie a sua assinatura do plano de corte.", siteName: "Barbium", locale: "pt_BR", type: "website" },
  referrer: "no-referrer",
};

function carregar(id: string) {
  return prisma.assinaturaPlano.findUnique({
    where: { id },
    include: {
      plano: {
        include: { servicos: { include: { servico: { select: { nome: true, ativo: true } } } } },
      },
      barbearia: {
        select: {
          nome: true,
          slug: true,
          endereco: true,
          telefone: true,
          logoAtualizadoEm: true,
          corMarca: true,
          corFundo: true,
          fuso: true,
          ativo: true,
        },
      },
    },
  });
}

export default async function MinhaAssinatura({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ retorno?: string }>;
}) {
  const { codigo } = await params;
  const { retorno } = await searchParams;
  const id = assinaturaDoCodigo(codigo);
  if (!id) notFound();

  let assinatura = await carregar(id);
  if (!assinatura || !assinatura.barbearia.ativo) notFound();

  // Cartão: confere no Mercado Pago antes de mostrar (o cliente pode estar
  // voltando do pagamento agora).
  if (assinatura.mpPreapprovalId) {
    await sincronizarCartao(assinatura.id).catch((erro) => {
      console.error("Minha assinatura (cartão):", erro instanceof Error ? erro.message : erro);
    });
    assinatura = (await carregar(id))!;
  }

  const agora = new Date();
  const situacao = situacaoAssinatura(assinatura, agora);
  const mes = situacao === "ATIVA" && assinatura.validaAte ? mesDoPlano(assinatura.validaAte, agora) : null;
  const usados = mes ? await usosNoMes(prisma, assinatura.id, mes) : null;
  const meios = await meiosDeRecebimento(assinatura.barbeariaId);
  const b = assinatura.barbearia;

  return (
    <div className="publico">
      <TemaDaBarbearia corMarca={b.corMarca} corFundo={b.corFundo} />
      <CabecalhoBarbearia
        nome={b.nome}
        slug={b.slug}
        endereco={b.endereco}
        telefone={b.telefone}
        logoAtualizadoEm={b.logoAtualizadoEm}
        subtitulo="Sua assinatura do plano de corte."
      />

      <main className="publico-main">
        <ProvedorFuso fuso={ianaDoFuso(b.fuso)}>
          <GerenciarAssinatura
            codigo={codigo}
            slug={b.slug}
            voltandoDoCartao={retorno === "1"}
            assinatura={{
              plano: assinatura.plano.nome,
              valor: Number(assinatura.plano.valor),
              planoAVenda: assinatura.plano.ativo,
              usosPorMes: assinatura.plano.usosPorMes,
              servicos: assinatura.plano.servicos.filter((s) => s.servico.ativo).map((s) => s.servico.nome),
              situacao,
              validaAte: assinatura.validaAte?.toISOString() ?? null,
              usados,
              cartaoStatus: assinatura.cartaoStatus,
            }}
            pixOnline={meios.pix !== null}
            whatsappBarbearia={b.telefone ? linkWhatsApp(b.telefone) : null}
          />
        </ProvedorFuso>
      </main>

      <footer className="publico-rodape">
        <Link href="/?utm_source=assinatura&utm_medium=rodape" className="publico-rodape-marca">
          <SimboloBarbium tamanho={16} />
          Agendamento pelo barbium
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacidade" className="publico-rodape-link">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
