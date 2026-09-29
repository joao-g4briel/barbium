import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Clock, Plus, Receipt, Scale } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { intervaloPeriodo, periodoValido, ROTULO_PERIODO, type PeriodoCaixa } from "@/lib/periodo-caixa";
import { formatarDataInstante, formatarHora, formatarMoeda } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { Abas } from "@/components/ui/abas";
import { Indicador } from "@/components/ui/indicador";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { BotaoExcluirLancamento } from "./botao-excluir-lancamento";

export const metadata: Metadata = { title: "Financeiro" };

type FiltroTipo = "todos" | "entradas" | "saidas";

export default async function PaginaCaixa({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; tipo?: string }>;
}) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo="Financeiro" />
        <AcessoRestrito descricao="O caixa da barbearia é visível só para o dono." />
      </>
    );
  }

  const { periodo: periodoParam, tipo: tipoParam } = await searchParams;
  const periodo = periodoValido(periodoParam);
  const filtroTipo: FiltroTipo = tipoParam === "entradas" || tipoParam === "saidas" ? tipoParam : "todos";
  const { inicio, fim } = intervaloPeriodo(periodo);

  const [lancamentos, confirmados] = await Promise.all([
    prisma.caixaLancamento.findMany({
      where: { barbeariaId: sessao.barbeariaId, criadoEm: { gte: inicio, lte: fim } },
      orderBy: { criadoEm: "desc" },
    }),
    // Confirmados do período que ainda não foram concluídos: é o que falta
    // entrar no caixa (concluir um atendimento lança a entrada sozinho).
    prisma.agendamento.findMany({
      where: { barbeariaId: sessao.barbeariaId, status: "CONFIRMADO", inicio: { gte: inicio, lte: fim } },
      select: { servico: { select: { preco: true } } },
    }),
  ]);

  const entradas = lancamentos.filter((l) => l.tipo === "ENTRADA").reduce((s, l) => s + Number(l.valor), 0);
  const saidas = lancamentos.filter((l) => l.tipo === "SAIDA").reduce((s, l) => s + Number(l.valor), 0);
  const saldo = entradas - saidas;
  const aReceber = confirmados.reduce((s, a) => s + Number(a.servico.preco), 0);

  const visiveis = lancamentos.filter((l) =>
    filtroTipo === "todos" ? true : filtroTipo === "entradas" ? l.tipo === "ENTRADA" : l.tipo === "SAIDA",
  );

  const periodos: PeriodoCaixa[] = ["hoje", "semana", "mes"];
  const hrefCom = (p: PeriodoCaixa, t: FiltroTipo) => {
    const busca = new URLSearchParams({ periodo: p });
    if (t !== "todos") busca.set("tipo", t);
    return `/painel/caixa?${busca.toString()}`;
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao={`${ROTULO_PERIODO[periodo]} · ${formatarDataInstante(inicio, { day: "2-digit", month: "2-digit" })} a ${formatarDataInstante(fim, { day: "2-digit", month: "2-digit" })}`}
        acoes={
          <Link href="/painel/caixa/novo" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Novo lançamento
          </Link>
        }
      />

      <div className="pilha">
        <Abas
          rotulo="Período"
          itens={periodos.map((p) => ({ href: hrefCom(p, filtroTipo), rotulo: ROTULO_PERIODO[p], ativo: p === periodo }))}
        />

        <section className="indicadores" aria-label="Resumo do período">
          <Indicador
            rotulo="Recebido"
            valor={formatarMoeda(entradas)}
            tomValor={entradas > 0 ? "positivo" : undefined}
            icone={<ArrowUpRight size={22} />}
            tomIcone="primario"
            detalhe="Entradas no caixa"
          />
          <Indicador
            rotulo="Saídas"
            valor={formatarMoeda(saidas)}
            icone={<ArrowDownRight size={22} />}
            detalhe="Despesas lançadas"
          />
          <Indicador
            rotulo="Saldo"
            valor={formatarMoeda(saldo)}
            icone={<Scale size={22} />}
            detalhe={saldo < 0 ? "Saídas maiores que o recebido" : "Recebido menos saídas"}
          />
          <Indicador
            rotulo="A receber"
            valor={formatarMoeda(aReceber)}
            icone={<Clock size={22} />}
            detalhe={`${confirmados.length} ${confirmados.length === 1 ? "confirmado ainda não concluído" : "confirmados ainda não concluídos"}`}
          />
        </section>

        <section className="card card-sem-padding" aria-labelledby="titulo-lancamentos">
          <div className="card-cabecalho">
            <h2 id="titulo-lancamentos" className="card-titulo">
              Lançamentos
            </h2>
            <Abas
              rotulo="Tipo de lançamento"
              itens={(
                [
                  ["todos", "Todos"],
                  ["entradas", "Entradas"],
                  ["saidas", "Saídas"],
                ] as const
              ).map(([t, rotulo]) => ({ href: hrefCom(periodo, t), rotulo, ativo: t === filtroTipo }))}
            />
          </div>

          {visiveis.length === 0 ? (
            <EstadoVazio
              icone={<Receipt size={22} />}
              titulo="Nenhum lançamento neste período"
              descricao="Atendimentos concluídos entram aqui automaticamente. Despesas e entradas avulsas você lança manualmente."
              acao={
                <Link href="/painel/caixa/novo" className="btn btn-secondary">
                  <Plus size={18} aria-hidden="true" />
                  Novo lançamento
                </Link>
              }
            />
          ) : (
            <div className="tabela-wrap">
              <table className="tabela tabela-responsiva">
                <thead>
                  <tr>
                    <th scope="col">Descrição</th>
                    <th scope="col">Data</th>
                    <th scope="col">Origem</th>
                    <th scope="col">Tipo</th>
                    <th scope="col" className="alinhar-direita">
                      Valor
                    </th>
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l) => {
                    const descricao = l.descricao ?? "Lançamento";
                    const entrada = l.tipo === "ENTRADA";
                    return (
                      <tr key={l.id}>
                        <td className="tabela-td-principal tabela-celula-principal">{descricao}</td>
                        <td data-rotulo="Data" className="num">
                          <span>
                            {formatarDataInstante(l.criadoEm)}{" "}
                            <span className="texto-secundario">{formatarHora(l.criadoEm)}</span>
                          </span>
                        </td>
                        <td data-rotulo="Origem" className="texto-secundario">
                          {l.agendamentoId ? "Atendimento concluído" : "Lançamento manual"}
                        </td>
                        <td data-rotulo="Tipo">
                          {entrada ? (
                            <Badge tom="sucesso" icone={<ArrowUpRight size={13} aria-hidden="true" />}>
                              Entrada
                            </Badge>
                          ) : (
                            <Badge icone={<ArrowDownRight size={13} aria-hidden="true" />}>Saída</Badge>
                          )}
                        </td>
                        <td data-rotulo="Valor" className="alinhar-direita tabela-celula-principal">
                          <span style={{ color: entrada ? "var(--color-primary)" : "var(--color-text)" }}>
                            {entrada ? "+ " : "− "}
                            {formatarMoeda(Number(l.valor))}
                          </span>
                        </td>
                        <td className="alinhar-direita">
                          {/* Lançamento de atendimento só sai reabrindo o agendamento. */}
                          {!l.agendamentoId && <BotaoExcluirLancamento id={l.id} descricao={descricao} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
