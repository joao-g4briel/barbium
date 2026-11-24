import type { Metadata } from "next";
import { obterSessao } from "@/lib/sessao";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { diasRestantes } from "@/lib/acesso";
import { formatarDataInstante } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { TabelaPrecos } from "@/components/precos/tabela-precos";
import { Badge } from "@/components/ui/badge";
import { estadoWhatsapp } from "@/lib/whatsapp-adicional";
import { linkAdicionalWhatsapp } from "@/lib/precos";

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
  const whatsapp = estadoWhatsapp(barbearia);

  const descricao = barbearia.acessoAte
    ? barbearia.emTeste
      ? `Teste grátis até ${formatarDataInstante(barbearia.acessoAte, { day: "2-digit", month: "2-digit" })} (${dias} ${dias === 1 ? "dia" : "dias"}).`
      : `Assinatura paga até ${formatarDataInstante(barbearia.acessoAte, { day: "2-digit", month: "2-digit", year: "numeric" })}.`
    : "Sua barbearia não tem prazo de assinatura.";

  return (
    <>
      <CabecalhoPagina titulo="Assinatura" descricao={descricao} />
      <div className="pilha">
        <section className="card" aria-labelledby="titulo-adicional">
          <div className="pilha-sm">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 id="titulo-adicional" className="card-titulo">
                Mensagens no WhatsApp
              </h2>
              {whatsapp === "adicional" && <Badge tom="sucesso">Ligadas</Badge>}
              {whatsapp === "teste" && <Badge tom="info">Ligadas no teste</Badge>}
              {whatsapp === "desligado" && <Badge tom="neutro">Desligadas</Badge>}
            </div>
            <p className="card-descricao">
              {whatsapp === "adicional"
                ? "Seu adicional de WhatsApp está ativo: confirmação, lembrete e avisos saem normalmente."
                : whatsapp === "teste"
                  ? "Durante o teste grátis as mensagens saem normalmente. Para continuar depois, marque o adicional de WhatsApp na hora de pagar a assinatura."
                  : "Confirmação, lembrete e avisos no WhatsApp fazem parte do adicional. Marque o adicional ao pagar a assinatura; se já assinou sem ele, fale com a gente."}
            </p>
            {whatsapp === "desligado" && (
              <div className="form-acoes">
                <a href={linkAdicionalWhatsapp()} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                  Contratar o adicional
                </a>
              </div>
            )}
          </div>
        </section>
        <TabelaPrecos acao="assinar" planoAtual={barbearia.plano} />
        <p className="texto-secundario texto-pequeno">
          O pagamento é feito pela Cakto. Depois de pagar, o acesso (e o adicional de WhatsApp, se você marcar) é
          liberado pelo período escolhido.
        </p>
      </div>
    </>
  );
}
