import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Scissors, UserX } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { SimboloBarbium } from "@/components/ui/marca";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { AssistenteAgendamento } from "./assistente-agendamento";

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

  if (!barbearia || !barbearia.ativo) notFound();

  // O "Novo agendamento" do painel traz a equipe pra cá; esse atalho leva de volta.
  const ehDaEquipe = sessao?.barbeariaId === barbearia.id;

  return (
    <div className="publico">
      <header className="publico-topo">
        <div className="publico-topo-conteudo">
          {ehDaEquipe && (
            <Link href="/painel/agenda" className="voltar">
              <ChevronLeft size={16} aria-hidden="true" />
              Voltar ao painel
            </Link>
          )}
          <h1>{barbearia.nome}</h1>
          <p className="texto-secundario">Agende seu horário em poucos passos.</p>
        </div>
      </header>

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
          <AssistenteAgendamento
            slug={slug}
            servicos={barbearia.servicos.map((s) => ({
              id: s.id,
              nome: s.nome,
              duracaoMinutos: s.duracaoMinutos,
              preco: Number(s.preco),
            }))}
            profissionais={barbearia.usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
          />
        )}
      </main>

      <footer className="publico-rodape">
        <SimboloBarbium variante="publico" tamanho={15} />
        Agendamento pelo barbium
      </footer>
    </div>
  );
}
