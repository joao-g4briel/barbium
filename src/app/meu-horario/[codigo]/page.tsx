import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimboloBarbium } from "@/components/ui/marca";
import { agendamentoDoLink } from "@/lib/horario-do-cliente";
import { ANTECEDENCIA_LINK_HORAS, podeAlterarPeloLink } from "@/lib/link-cliente";
import { linkWhatsApp } from "@/lib/formatar";
import { GerenciarHorario } from "./gerenciar-horario";

// Página que o cliente abre pelo link da mensagem: vê o horário e, até
// ANTECEDENCIA_LINK_HORAS antes, muda ou cancela. Sem login; o código no
// endereço é o que dá acesso (ver lib/link-cliente).

export const metadata: Metadata = {
  title: "Seu horário",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function MeuHorario({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const ag = await agendamentoDoLink(codigo);
  if (!ag) notFound();

  return (
    <div className="publico">
      <header className="publico-topo">
        <div className="publico-topo-conteudo">
          <h1>{ag.barbearia.nome}</h1>
          <p className="texto-secundario">Olá, {ag.cliente.nome.trim().split(/\s+/)[0]}. Este é o seu horário.</p>
        </div>
      </header>

      <main className="publico-main">
        <GerenciarHorario
          codigo={codigo}
          agendamento={{
            inicio: ag.inicio.toISOString(),
            fim: ag.fim.toISOString(),
            status: ag.status,
            servico: ag.servico.nome,
            profissional: ag.barbeiro.nome,
            sinalPago: ag.sinalStatus === "PAGO" && ag.sinalValor !== null && !ag.sinalDevolvidoEm ? Number(ag.sinalValor) : null,
          }}
          podeAlterar={podeAlterarPeloLink(ag)}
          antecedenciaHoras={ANTECEDENCIA_LINK_HORAS}
          whatsappBarbearia={ag.barbearia.telefone ? linkWhatsApp(ag.barbearia.telefone) : null}
          linkAgendar={`/agendar/${ag.barbearia.slug}`}
        />
      </main>

      <footer className="publico-rodape">
        <SimboloBarbium tamanho={16} />
        Agendamento pelo barbium
        <span aria-hidden="true">·</span>
        <Link href="/privacidade" className="publico-rodape-link">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
