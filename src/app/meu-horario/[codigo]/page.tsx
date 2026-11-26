import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimboloBarbium } from "@/components/ui/marca";
import { CabecalhoBarbearia } from "@/components/publico/cabecalho-barbearia";
import { TemaDaBarbearia } from "@/components/tema-barbearia";
import { agendamentoDoLink } from "@/lib/horario-do-cliente";
import { ANTECEDENCIA_LINK_HORAS, podeAlterarPeloLink } from "@/lib/link-cliente";
import { linkWhatsApp } from "@/lib/formatar";
import { GerenciarHorario } from "./gerenciar-horario";
import { ProvedorFuso } from "@/components/fuso-contexto";
import { ianaDoFuso } from "@/lib/fusos";

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
      <TemaDaBarbearia corMarca={ag.barbearia.corMarca} corFundo={ag.barbearia.corFundo} />
      <CabecalhoBarbearia
        nome={ag.barbearia.nome}
        slug={ag.barbearia.slug}
        endereco={ag.barbearia.endereco}
        telefone={ag.barbearia.telefone}
        logoAtualizadoEm={ag.barbearia.logoAtualizadoEm}
        subtitulo={`Olá, ${ag.cliente.nome.trim().split(/\s+/)[0]}. Este é o seu horário.`}
      />

      <main className="publico-main">
        <ProvedorFuso fuso={ianaDoFuso(ag.barbearia.fuso)}>
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
            diasAFrente={ag.barbearia.diasAFrente}
            whatsappBarbearia={ag.barbearia.telefone ? linkWhatsApp(ag.barbearia.telefone) : null}
            linkAgendar={`/agendar/${ag.barbearia.slug}`}
          />
        </ProvedorFuso>
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
