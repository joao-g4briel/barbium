import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Percent, UsersRound, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { intervaloPeriodo, periodoValido, PERIODOS_CAIXA, ROTULO_PERIODO, type PeriodoCaixa } from "@/lib/periodo-caixa";
import { atendimentosComComissao, resumirPorProfissional, totalizar } from "@/lib/comissoes";
import { formatarDataInstante, formatarMoeda } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { Abas } from "@/components/ui/abas";
import { Indicador } from "@/components/ui/indicador";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Avatar } from "@/components/ui/avatar";
import { Alerta } from "@/components/ui/alerta";
import { NavFinanceiro } from "../nav-financeiro";
import { ExtratoComissoes } from "./extrato-comissoes";
import { FUSO_PADRAO } from "@/lib/fusos";

export const metadata: Metadata = { title: "Comissões" };

// Dono: comissões de toda a equipe, e o extrato de cada profissional
// (?profissional=). Barbeiro: só o próprio extrato ("Minhas comissões").
export default async function PaginaComissoes({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; profissional?: string }>;
}) {
  const sessao = await obterSessao();
  const fuso = sessao?.fuso ?? FUSO_PADRAO;
  if (!sessao?.barbeariaId) return null;

  const params = await searchParams;
  const periodo = periodoValido(params.periodo);
  const { inicio, fim } = intervaloPeriodo(periodo, fuso);
  const intervalo = `${ROTULO_PERIODO[periodo]} · ${formatarDataInstante(inicio, { day: "2-digit", month: "2-digit" }, fuso)} a ${formatarDataInstante(fim, { day: "2-digit", month: "2-digit" }, fuso)}`;

  const abasPeriodo = (extra = "") => (
    <Abas
      rotulo="Período"
      itens={PERIODOS_CAIXA.map((p) => ({
        href: `/painel/caixa/comissoes?periodo=${p}${extra}`,
        rotulo: ROTULO_PERIODO[p],
        ativo: p === periodo,
      }))}
    />
  );

  if (sessao.role !== "DONO") {
    const atendimentos = await atendimentosComComissao(sessao.barbeariaId, { inicio, fim, profissionalId: sessao.sub });
    return (
      <>
        <CabecalhoPagina titulo="Minhas comissões" descricao={intervalo} />
        <div className="pilha">
          {abasPeriodo()}
          <ExtratoComissoes atendimentos={atendimentos} visaoDoDono={false} fuso={fuso} />
        </div>
      </>
    );
  }

  if (params.profissional) {
    const profissional = await prisma.usuario.findFirst({
      where: { id: params.profissional, barbeariaId: sessao.barbeariaId },
      select: { id: true, nome: true },
    });
    if (profissional) {
      const atendimentos = await atendimentosComComissao(sessao.barbeariaId, {
        inicio,
        fim,
        profissionalId: profissional.id,
      });
      return (
        <>
          <CabecalhoPagina
            titulo={`Comissões de ${profissional.nome}`}
            descricao={intervalo}
            voltar={{ href: `/painel/caixa/comissoes?periodo=${periodo}`, rotulo: "Todos os profissionais" }}
          />
          <div className="pilha">
            <NavFinanceiro atual="comissoes" periodo={periodo} />
            {abasPeriodo(`&profissional=${profissional.id}`)}
            <ExtratoComissoes atendimentos={atendimentos} visaoDoDono fuso={fuso} />
          </div>
        </>
      );
    }
  }

  return <ResumoDaEquipe barbeariaId={sessao.barbeariaId} periodo={periodo} intervalo={intervalo} abas={abasPeriodo()} />;
}

async function ResumoDaEquipe({
  barbeariaId,
  periodo,
  intervalo,
  abas,
}: {
  barbeariaId: string;
  periodo: PeriodoCaixa;
  intervalo: string;
  abas: React.ReactNode;
}) {
  const fuso = (await obterSessao())?.fuso ?? FUSO_PADRAO;
  const { inicio, fim } = intervaloPeriodo(periodo, fuso);
  const atendimentos = await atendimentosComComissao(barbeariaId, { inicio, fim });
  const linhas = resumirPorProfissional(atendimentos);
  const total = totalizar(atendimentos);

  return (
    <>
      <CabecalhoPagina titulo="Comissões" descricao={intervalo} />

      <div className="pilha">
        <NavFinanceiro atual="comissoes" periodo={periodo} />
        {abas}

        <section
          className="indicadores"
          style={{ "--indicadores-colunas": 3 } as CSSProperties}
          aria-label="Resumo das comissões"
        >
          <Indicador
            rotulo="Comissões do período"
            valor={formatarMoeda(total.comissao)}
            icone={<Percent size={22} />}
            tomIcone="primario"
            detalhe={`${linhas.length} ${linhas.length === 1 ? "profissional" : "profissionais"}`}
          />
          <Indicador
            rotulo="Faturamento dos atendimentos"
            valor={formatarMoeda(total.faturamento)}
            icone={<UsersRound size={22} />}
            detalhe={`${total.atendimentos} ${total.atendimentos === 1 ? "atendimento concluído" : "atendimentos concluídos"}`}
          />
          <Indicador
            rotulo="Fica com a barbearia"
            valor={formatarMoeda(total.faturamento - total.comissao)}
            icone={<Wallet size={22} />}
            detalhe="Faturamento menos comissões"
          />
        </section>

        {total.semPercentual > 0 && (
          <Alerta tom="atencao">
            {total.semPercentual === 1 ? "1 atendimento ficou" : `${total.semPercentual} atendimentos ficaram`} sem
            comissão porque nem o profissional nem o serviço tinham percentual na hora da conclusão. Defina em{" "}
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
                momento da conclusão. Toque num profissional para ver o extrato.
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
                        <Link
                          href={`/painel/caixa/comissoes?periodo=${periodo}&profissional=${l.id}`}
                          className="tabela-celula-link"
                          aria-label={`Ver extrato de ${l.nome}`}
                        >
                          <Avatar nome={l.nome} tamanho={32} />
                          <span className="tabela-celula-principal">{l.nome}</span>
                          <ChevronRight size={16} aria-hidden="true" className="texto-secundario" />
                        </Link>
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
