import type { Metadata } from "next";
import Link from "next/link";
import { Plus, SearchX, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ROTULO_PLANO } from "@/lib/planos";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { CampoBusca } from "@/components/ui/busca";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Barbearias" };

export default async function ListaBarbearias({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const termo = q?.trim() ?? "";

  const [barbearias, total] = await Promise.all([
    prisma.barbearia.findMany({
      where: termo
        ? {
            OR: [
              { nome: { contains: termo, mode: "insensitive" } },
              { slug: { contains: termo.toLowerCase() } },
            ],
          }
        : {},
      orderBy: { criadoEm: "desc" },
      include: { usuarios: { where: { role: "DONO" }, select: { nome: true }, take: 1 } },
    }),
    prisma.barbearia.count(),
  ]);

  return (
    <>
      <CabecalhoPagina
        titulo="Barbearias"
        descricao={`${total} ${total === 1 ? "barbearia cadastrada" : "barbearias cadastradas"}`}
        acoes={
          <Link href="/super-admin/barbearias/novo" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Nova barbearia
          </Link>
        }
      />

      {total === 0 ? (
        <div className="card">
          <EstadoVazio
            icone={<Store size={22} />}
            titulo="Nenhuma barbearia cadastrada"
            descricao="Crie a primeira barbearia e o acesso do dono dela."
            acao={
              <Link href="/super-admin/barbearias/novo" className="btn btn-primary">
                <Plus size={18} aria-hidden="true" />
                Nova barbearia
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="barra-ferramentas">
            <CampoBusca valorInicial={termo} placeholder="Buscar por nome ou link" rotulo="Buscar barbearias" />
          </div>
          <section className="card card-sem-padding" aria-label="Barbearias">
            {barbearias.length === 0 ? (
              <EstadoVazio
                icone={<SearchX size={22} />}
                titulo="Nenhuma barbearia encontrada"
                acao={
                  <Link href="/super-admin/barbearias" className="btn btn-secondary">
                    Limpar busca
                  </Link>
                }
              />
            ) : (
              <div className="tabela-wrap">
                <table className="tabela tabela-responsiva">
                  <thead>
                    <tr>
                      <th scope="col">Barbearia</th>
                      <th scope="col">Plano</th>
                      <th scope="col">Dono</th>
                      <th scope="col">Situação</th>
                      <th scope="col">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {barbearias.map((b) => (
                      <tr key={b.id}>
                        <td className="tabela-td-principal">
                          <p className="tabela-celula-principal">{b.nome}</p>
                          <p className="texto-secundario texto-pequeno">/agendar/{b.slug}</p>
                        </td>
                        <td data-rotulo="Plano">{ROTULO_PLANO[b.plano]}</td>
                        <td data-rotulo="Dono">
                          {b.usuarios[0]?.nome ?? <span className="texto-secundario">Sem dono</span>}
                        </td>
                        <td data-rotulo="Situação">
                          {b.ativo ? <Badge tom="sucesso">Ativa</Badge> : <Badge tom="atencao">Suspensa</Badge>}
                        </td>
                        <td className="alinhar-direita">
                          <Link href={`/super-admin/barbearias/${b.id}`} className="btn btn-secondary btn-sm">
                            Gerenciar<span className="sr-only"> {b.nome}</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
