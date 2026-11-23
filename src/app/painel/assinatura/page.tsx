import type { Metadata } from "next";
import { obterSessao } from "@/lib/sessao";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { diasRestantes } from "@/lib/acesso";
import { formatarDataInstante } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { TabelaPrecos } from "@/components/precos/tabela-precos";

export const metadata: Metadata = { title: "Assinatura" };

// Planos e pagamento, a partir do painel (durante o teste ou para renovar).
export default async function PaginaAssinatura() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo="Assinatura" />
        <AcessoRestrito descricao="A assinatura da barbearia é feita pelo dono." />
      </>
    );
  }

  const barbearia = await obterBarbearia(sessao.barbeariaId);
  if (!barbearia) return null;
  const dias = diasRestantes(barbearia);

  const descricao = barbearia.acessoAte
    ? barbearia.emTeste
      ? `Teste grátis até ${formatarDataInstante(barbearia.acessoAte, { day: "2-digit", month: "2-digit" })} (${dias} ${dias === 1 ? "dia" : "dias"}).`
      : `Assinatura paga até ${formatarDataInstante(barbearia.acessoAte, { day: "2-digit", month: "2-digit", year: "numeric" })}.`
    : "Sua barbearia não tem prazo de assinatura.";

  return (
    <>
      <CabecalhoPagina titulo="Assinatura" descricao={descricao} />
      <div className="pilha">
        <TabelaPrecos acao="assinar" planoAtual={barbearia.plano} />
        <p className="texto-secundario texto-pequeno">
          O pagamento é feito pela Cakto. Depois de pagar, o acesso é liberado pelo período escolhido.
        </p>
      </div>
    </>
  );
}
