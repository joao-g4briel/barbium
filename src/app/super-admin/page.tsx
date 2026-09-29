import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Ban, CheckCircle2, ChevronRight, Plus, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PLANOS, ROTULO_PLANO } from "@/lib/planos";
import { formatarDataInstante } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { Indicador } from "@/components/ui/indicador";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Visão geral da plataforma" };

export default async function DashboardSuperAdmin() {
  const [total, ativas, porPlano, recentes] = await Promise.all([
    prisma.barbearia.count(),
    prisma.barbearia.count({ where: { ativo: true } }),
    prisma.barbearia.groupBy({ by: ["plano"], _count: { _all: true }, where: { ativo: true } }),
    prisma.barbearia.findMany({ orderBy: { criadoEm: "desc" }, take: 5 }),
  ]);

  const contagemPorPlano = Object.fromEntries(porPlano.map((linha) => [linha.plano, linha._count._all]));
  const suspensas = total - ativas;

  return (
    <>
      <CabecalhoPagina
        titulo="Visão geral"
        descricao="Barbearias que usam o Barbium"
        acoes={
          <Link href="/super-admin/barbearias/novo" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Nova barbearia
          </Link>
        }
      />

      <div className="pilha">
        <section className="indicadores" style={{ "--indicadores-colunas": 3 } as React.CSSProperties} aria-label="Resumo">
          <Indicador rotulo="Barbearias cadastradas" valor={total} icone={<Store size={22} />} />
          <Indicador rotulo="Ativas" valor={ativas} icone={<CheckCircle2 size={22} />} tomIcone="primario" />
          <Indicador rotulo="Suspensas" valor={suspensas} icone={<Ban size={22} />} detalhe="Sem acesso ao painel" />
        </section>

        <div className="grade-painel grade-painel-2-1">
          <section className="card card-sem-padding" aria-labelledby="titulo-recentes">
            <div className="card-cabecalho">
              <h2 id="titulo-recentes" className="card-titulo">
                Cadastradas recentemente
              </h2>
              <Link href="/super-admin/barbearias" className="link texto-pequeno">
                Ver todas <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {recentes.length === 0 ? (
              <EstadoVazio
                icone={<Store size={22} />}
                titulo="Nenhuma barbearia cadastrada"
                descricao="Crie a primeira barbearia para começar."
              />
            ) : (
              <div className="lista">
                {recentes.map((b) => (
                  <Link key={b.id} href={`/super-admin/barbearias/${b.id}`} className="lista-item">
                    <div className="lista-item-principal">
                      <p className="lista-item-titulo">{b.nome}</p>
                      <p className="lista-item-sub">
                        Plano {ROTULO_PLANO[b.plano]} · desde {formatarDataInstante(b.criadoEm)}
                      </p>
                    </div>
                    <div className="lista-item-lateral">
                      {b.ativo ? <Badge tom="sucesso">Ativa</Badge> : <Badge tom="atencao">Suspensa</Badge>}
                      <ChevronRight size={18} className="lista-item-chevron" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="titulo-planos">
            <div className="card-cabecalho">
              <div>
                <h2 id="titulo-planos" className="card-titulo">
                  Ativas por plano
                </h2>
              </div>
            </div>
            <dl className="fatos">
              {PLANOS.map((plano) => (
                <div key={plano}>
                  <dt>{ROTULO_PLANO[plano]}</dt>
                  <dd>{contagemPorPlano[plano] ?? 0}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
