import type { Metadata } from "next";
import { acessoVencido } from "@/lib/acesso";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Scissors, UserX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { obterSinalPublico } from "@/lib/sinal";
import { SimboloBarbium } from "@/components/ui/marca";
import { CabecalhoBarbearia } from "@/components/publico/cabecalho-barbearia";
import { estiloDaMarca } from "@/lib/cor-marca";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { AssistenteAgendamento } from "./assistente-agendamento";
import { ProvedorFuso } from "@/components/fuso-contexto";
import { ianaDoFuso } from "@/lib/fusos";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const barbearia = await prisma.barbearia.findUnique({ where: { slug }, select: { nome: true } });
  return { title: barbearia ? `Agendar em ${barbearia.nome}` : "Agendamento" };
}

export default async function AgendamentoPublico({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [barbearia, sessao] = await Promise.all([
    prisma.barbearia.findUnique({
      where: { slug },
      include: {
        servicos: { where: { ativo: true }, orderBy: { nome: "asc" } },
        usuarios: {
          where: { ativo: true, role: { in: ["DONO", "BARBEIRO"] } },
          orderBy: { nome: "asc" },
        },
      },
    }),
    obterSessao(),
  ]);

  // Barbearia suspensa ou com o acesso vencido não recebe agendamento novo.
  if (!barbearia || !barbearia.ativo || acessoVencido(barbearia)) notFound();

  const sinal = await obterSinalPublico(barbearia.id);

  // O "Novo agendamento" do painel traz a equipe pra cá; esse atalho leva de volta.
  const ehDaEquipe = sessao?.barbeariaId === barbearia.id;

  return (
    <div className="publico" style={estiloDaMarca(barbearia.corMarca)}>
      <CabecalhoBarbearia
        nome={barbearia.nome}
        slug={barbearia.slug}
        endereco={barbearia.endereco}
        telefone={barbearia.telefone}
        logoAtualizadoEm={barbearia.logoAtualizadoEm}
        subtitulo="Agende seu horário em poucos passos."
        antes={
          ehDaEquipe ? (
            <Link href="/painel/agenda" className="voltar">
              <ChevronLeft size={16} aria-hidden="true" />
              Voltar ao painel
            </Link>
          ) : undefined
        }
      />

      <main className="publico-main">
        {barbearia.servicos.length === 0 ? (
          <div className="card">
            <EstadoVazio
              icone={<Scissors size={22} />}
              titulo="Agendamento indisponível"
              descricao="Esta barbearia ainda não cadastrou os serviços."
            />
          </div>
        ) : barbearia.usuarios.length === 0 ? (
          <div className="card">
            <EstadoVazio
              icone={<UserX size={22} />}
              titulo="Agendamento indisponível"
              descricao="Esta barbearia ainda não tem profissionais disponíveis."
            />
          </div>
        ) : (
          <ProvedorFuso fuso={ianaDoFuso(barbearia.fuso)}>
            <AssistenteAgendamento
              slug={slug}
              servicos={barbearia.servicos.map((s) => ({
                id: s.id,
                nome: s.nome,
                duracaoMinutos: s.duracaoMinutos,
                preco: Number(s.preco),
              }))}
              profissionais={barbearia.usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
              sinal={sinal}
            />
          </ProvedorFuso>
        )}
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
