import type { Metadata } from "next";
import Link from "next/link";
import { Percent, UsersRound, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { intervaloPeriodo, periodoValido, PERIODOS_CAIXA, ROTULO_PERIODO } from "@/lib/periodo-caixa";
import { formatarDataInstante, formatarMoeda } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { Abas } from "@/components/ui/abas";
import { Indicador } from "@/components/ui/indicador";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Avatar } from "@/components/ui/avatar";
import { Alerta } from "@/components/ui/alerta";
import { NavFinanceiro } from "../nav-financeiro";

export const metadata: Metadata = { title: "Comissões" };

interface LinhaComissao {
  id: string;
  nome: string;
  atendimentos: number;
  semPercentual: number;
  faturamento: number;
  comissao: number;
}

export default async function PaginaComissoes({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo="Comissões" />
        <AcessoRestrito descricao="As comissões da equipe são visíveis só para o dono." />
      </>
    );
  }

  const periodo = periodoValido((await searchParams).periodo);
  const { inicio, fim } = intervaloPeriodo(periodo);

  // Atendimentos concluídos no período, pela data do atendimento. A comissão
  // de cada um foi calculada e guardada na conclusão.
  const concluidos = await prisma.agendamento.findMany({
    where: { barbeariaId: sessao.barbeariaId, status: "CONCLUIDO", inicio: { gte: inicio, lte: fim } },
    select: {
      comissaoValor: true,
      barbeiro: { select: { id: true, nome: true } },
      caixaLancamentos: { select: { valor: true } },
    },
  });

  const porProfissional = new Map<string, LinhaComissao>();
  for (const a of concluidos) {
    const linha = porProfissional.get(a.barbeiro.id) ?? {
      id: a.barbeiro.id,
      nome: a.barbeiro.nome,
      atendimentos: 0,
      semPercentual: 0,
      faturamento: 0,
      comissao: 0,
    };
    linha.atendimentos += 1;
    // Faturamento = o que entrou no caixa por esse atendimento (sinal + restante).
    linha.faturamento += a.caixaLancamentos.reduce((s, l) => s + Number(l.valor), 0);
    if (a.comissaoValor === null) linha.semPercentual += 1;
    else linha.comissao += Number(a.comissaoValor);
    porProfissional.set(a.barbeiro.id, linha);
  }
  const linhas = [...porProfissional.values()].sort((x, y) => y.comissao - x.comissao || x.nome.localeCompare(y.nome));
  const totalComissao = linhas.reduce((s, l) => s + l.comissao, 0);
  const totalFaturamento = linhas.reduce((s, l) => s + l.faturamento, 0);
  const totalSemPercentual = linhas.reduce((s, l) => s + l.semPercentual, 0);

  return (
    <>
      <CabecalhoPagina
        titulo="Comissões"
        descricao={`${ROTULO_PERIODO[periodo]} · ${formatarDataInstante(inicio, { day: "2-digit", month: "2-digit" })} a ${formatarDataInstante(fim, { day: "2-digit", month: "2-digit" })}`}
      />

      <div className="pilha">
        <NavFinanceiro atual="comissoes" periodo={periodo} />
        <Abas
          rotulo="Período"
          itens={PERIODOS_CAIXA.map((p) => ({
            href: `/painel/caixa/comissoes?periodo=${p}`,
            rotulo: ROTULO_PERIODO[p],
            ativo: p === periodo,
          }))}
        />

        <section className="indicadores" style={{ "--indicadores-colunas": 3 } as React.CSSProperties} aria-label="Resumo das comissões">
          <Indicador
            rotulo="Comissões do período"
            valor={formatarMoeda(totalComissao)}
            icone={<Percent size={22} />}
            tomIcone="primario"
            detalhe={`${linhas.length} ${linhas.length === 1 ? "profissional" : "profissionais"}`}
          />
          <Indicador
            rotulo="Faturamento dos atendimentos"
            valor={formatarMoeda(totalFaturamento)}
            icone={<UsersRound size={22} />}
            detalhe={`${concluidos.length} ${concluidos.length === 1 ? "atendimento concluído" : "atendimentos concluídos"}`}
          />
          <Indicador
            rotulo="Fica com a barbearia"
            valor={formatarMoeda(totalFaturamento - totalComissao)}
            icone={<Wallet size={22} />}
            detalhe="Faturamento menos comissões"
          />
        </section>

        {totalSemPercentual > 0 && (
          <Alerta tom="atencao">
            {totalSemPercentual === 1 ? "1 atendimento ficou" : `${totalSemPercentual} atendimentos ficaram`} sem comissão
            porque nem o profissional nem o serviço tinham percentual na hora da conclusão. Defina em{" "}
            <Link href="/painel/equipe" className="link">
              Equipe
            </Link>{" "}
            ou em{" "}
            <Link href="/painel/servicos" className="link">
              Serviços
            </Link>
            .
          </Alerta>
        )}

        <section className="card card-sem-padding" aria-labelledby="titulo-comissoes">
          <div className="card-cabecalho">
            <div>
              <h2 id="titulo-comissoes" className="card-titulo">
                Por profissional
              </h2>
              <p className="card-descricao">
                Vale o percentual do profissional; sem ele, o do serviço. Calculada sobre o valor cheio do serviço, no
                momento da conclusão.
              </p>
            </div>
          </div>

          {linhas.length === 0 ? (
            <EstadoVazio
              icone={<Percent size={22} />}
              titulo="Nenhum atendimento concluído neste período"
              descricao="As comissões aparecem aqui conforme os atendimentos são concluídos na Agenda."
            />
          ) : (
            <div className="tabela-wrap">
              <table className="tabela tabela-responsiva">
                <thead>
                  <tr>
                    <th scope="col">Profissional</th>
                    <th scope="col" className="alinhar-direita">
                      Atendimentos
                    </th>
                    <th scope="col" className="alinhar-direita">
                      Faturamento
                    </th>
                    <th scope="col" className="alinhar-direita">
                      Comissão
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.id}>
                      <td className="tabela-td-principal">
                        <div className="tabela-celula-link">
                          <Avatar nome={l.nome} tamanho={32} />
                          <span className="tabela-celula-principal">{l.nome}</span>
                        </div>
                      </td>
                      <td data-rotulo="Atendimentos" className="alinhar-direita num">
                        {l.atendimentos}
                        {l.semPercentual > 0 && (
                          <span className="texto-secundario texto-pequeno"> ({l.semPercentual} sem %)</span>
                        )}
                      </td>
                      <td data-rotulo="Faturamento" className="alinhar-direita num">
                        {formatarMoeda(l.faturamento)}
                      </td>
                      <td data-rotulo="Comissão" className="alinhar-direita num tabela-celula-principal">
                        {formatarMoeda(l.comissao)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="texto-secundario texto-pequeno">
          Para registrar o pagamento de uma comissão, lance uma saída em{" "}
          <Link href="/painel/caixa/novo" className="link">
            Novo lançamento
          </Link>
          .
        </p>
      </div>
    </>
  );
}
