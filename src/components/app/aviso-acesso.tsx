import Link from "next/link";
import { Clock, MessageCircle } from "lucide-react";
import type { Plano } from "@prisma/client";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { Alerta } from "@/components/ui/alerta";
import { TabelaPrecos } from "@/components/precos/tabela-precos";
import { WHATSAPP_VENDAS } from "@/lib/precos";

// Faixa no topo do painel durante o teste grátis.
export function FaixaTeste({ dias, souDono }: { dias: number; souDono: boolean }) {
  const texto =
    dias <= 1 ? "Último dia do teste grátis." : `Teste grátis: faltam ${dias} dias.`;
  return (
    <div className="faixa-teste" role="status">
      <Clock size={16} aria-hidden="true" />
      <span>
        {texto} {souDono ? "Assine para continuar sem interrupção." : "Fale com o dono da barbearia para continuar."}
      </span>
      {souDono && (
        <Link href="/painel/assinatura" className="link">
          Ver planos
        </Link>
      )}
    </div>
  );
}

// No lugar do painel quando o teste ou a assinatura venceram.
export function AcessoVencido({
  souDono,
  emTeste,
  plano,
}: {
  souDono: boolean;
  emTeste: boolean;
  plano: Plano;
}) {
  const contato = `https://wa.me/${WHATSAPP_VENDAS}?text=${encodeURIComponent("Olá! Já paguei a assinatura do Barbium e quero liberar o acesso.")}`;
  return (
    <>
      <CabecalhoPagina
        titulo={emTeste ? "Seu teste grátis terminou" : "Sua assinatura venceu"}
        descricao={
          souDono
            ? "Agenda, clientes e caixa continuam guardados. Escolha um plano para voltar a usar o painel."
            : "O painel está pausado até o dono da barbearia assinar. Seus dados continuam guardados."
        }
      />
      <div className="pilha">
        <Alerta tom="atencao">
          Enquanto isso, o link de agendamento não recebe horários novos e os lembretes ficam parados.
        </Alerta>
        {souDono && (
          <>
            <TabelaPrecos acao="assinar" planoAtual={plano} />
            <p className="texto-secundario texto-pequeno">
              Depois de pagar, o acesso é liberado em seguida. Se demorar,{" "}
              <a href={contato} target="_blank" rel="noopener noreferrer" className="link">
                <MessageCircle size={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> fale com a gente
              </a>
              .
            </p>
          </>
        )}
      </div>
    </>
  );
}
