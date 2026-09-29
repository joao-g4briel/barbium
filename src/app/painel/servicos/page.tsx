import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleSlash, Pencil, Plus, Scissors } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { formatarDuracao, formatarMoeda } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Serviços" };

export default async function PaginaServicos() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const servicos = await prisma.servico.findMany({
    where: { barbeariaId: sessao.barbeariaId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  const souDono = sessao.role === "DONO";
  const ativos = servicos.filter((s) => s.ativo).length;

  return (
    <>
      <CabecalhoPagina
        titulo="Serviços"
        descricao={
          servicos.length === 0
            ? "O que a barbearia oferece no link de agendamento"
            : `${ativos} ${ativos === 1 ? "ativo" : "ativos"} no link de agendamento`
        }
        acoes={
          souDono && (
            <Link href="/painel/servicos/novo" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" />
              Novo serviço
            </Link>
          )
        }
      />

      <section className="card card-sem-padding" aria-label="Lista de serviços">
        {servicos.length === 0 ? (
          <EstadoVazio
            icone={<Scissors size={22} />}
            titulo="Nenhum serviço cadastrado"
            descricao={
              souDono
                ? "Cadastre pelo menos um serviço para ele aparecer no link de agendamento."
                : "O dono da barbearia ainda não cadastrou serviços."
            }
            acao={
              souDono && (
                <Link href="/painel/servicos/novo" className="btn btn-primary">
                  <Plus size={18} aria-hidden="true" />
                  Cadastrar serviço
                </Link>
              )
            }
          />
        ) : (
          <div className="tabela-wrap">
            <table className="tabela tabela-responsiva">
              <thead>
                <tr>
                  <th scope="col">Serviço</th>
                  <th scope="col">Duração</th>
                  <th scope="col" className="alinhar-direita">
                    Preço
                  </th>
                  <th scope="col" className="alinhar-direita">
                    Comissão
                  </th>
                  <th scope="col">Situação</th>
                  {souDono && (
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {servicos.map((servico) => (
                  <tr key={servico.id}>
                    <td className="tabela-td-principal tabela-celula-principal">{servico.nome}</td>
                    <td data-rotulo="Duração">{formatarDuracao(servico.duracaoMinutos)}</td>
                    <td data-rotulo="Preço" className="alinhar-direita">
                      {formatarMoeda(Number(servico.preco))}
                    </td>
                    <td data-rotulo="Comissão" className="alinhar-direita">
                      {servico.comissaoPercentual != null ? (
                        `${Number(servico.comissaoPercentual).toLocaleString("pt-BR")}%`
                      ) : (
                        <span className="texto-secundario">—</span>
                      )}
                    </td>
                    <td data-rotulo="Situação">
                      {servico.ativo ? (
                        <Badge tom="sucesso" icone={<CheckCircle2 size={13} aria-hidden="true" />}>
                          Ativo
                        </Badge>
                      ) : (
                        <Badge icone={<CircleSlash size={13} aria-hidden="true" />}>Inativo</Badge>
                      )}
                    </td>
                    {souDono && (
                      <td className="alinhar-direita">
                        <Link href={`/painel/servicos/${servico.id}`} className="btn btn-ghost btn-sm">
                          <Pencil size={15} aria-hidden="true" />
                          Editar<span className="sr-only"> {servico.nome}</span>
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
