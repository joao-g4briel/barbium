import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { CalendarClock, CalendarX2, Receipt, UserX } from "lucide-react";
import { obterSessao } from "@/lib/sessao";
import { intervaloPeriodo, periodoValido, PERIODOS_CAIXA, ROTULO_PERIODO } from "@/lib/periodo-caixa";
import { obterIndicadores, type Indicadores } from "@/lib/indicadores";
import { formatarDataInstante, formatarDuracao, formatarMoeda } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { Abas } from "@/components/ui/abas";
import { Indicador } from "@/components/ui/indicador";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Indicadores" };

function porcentagem(fracao: number | null): string {
  return fracao === null ? "—" : `${Math.round(fracao * 100)}%`;
}

function Ocupacao({ ind, nome }: { ind: Indicadores; nome: string }) {
  if (ind.ocupacao === null) return <span className="texto-secundario texto-pequeno">Sem expediente</span>;
  const pct = Math.round(ind.ocupacao * 100);
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 140, maxWidth: 220, marginLeft: "auto" }}>
      <div
        className="barra-progresso"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Ocupação de ${nome}`}
      >
        <div className="barra-progresso-preenchimento" style={{ width: `${pct}%` }} />
      </div>
      <p className="texto-secundario texto-pequeno num">
        {pct}% · {formatarDuracao(ind.minutosOcupados)} de {formatarDuracao(ind.minutosCapacidade)}
      </p>
    </div>
  );
}

export default async function PaginaIndicadores({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo="Indicadores" />
        <AcessoRestrito descricao="Os indicadores da barbearia são visíveis só para o dono." />
      </>
    );
  }

  const periodo = periodoValido((await searchParams).periodo);
  const intervalo = intervaloPeriodo(periodo);
  const { geral, porProfissional } = await obterIndicadores(sessao.barbeariaId, intervalo);
  const finalizados = geral.concluidos + geral.faltas;

  return (
    <>
      <CabecalhoPagina
        titulo="Indicadores"
        descricao={`${ROTULO_PERIODO[periodo]} · ${formatarDataInstante(intervalo.inicio, { day: "2-digit", month: "2-digit" })} a ${formatarDataInstante(intervalo.fim, { day: "2-digit", month: "2-digit" })}`}
      />

      <div className="pilha">
        <Abas
          rotulo="Período"
          itens={PERIODOS_CAIXA.map((p) => ({
            href: `/painel/indicadores?periodo=${p}`,
            rotulo: ROTULO_PERIODO[p],
            ativo: p === periodo,
          }))}
        />

        <section
          className="indicadores"
          style={{ "--indicadores-colunas": 4 } as CSSProperties}
          aria-label="Indicadores do período"
        >
          <Indicador
            rotulo="Ticket médio"
            valor={geral.ticketMedio === null ? "—" : formatarMoeda(geral.ticketMedio)}
            icone={<Receipt size={22} />}
            tomIcone="primario"
            detalhe={`${formatarMoeda(geral.faturamento)} em ${geral.concluidos} ${geral.concluidos === 1 ? "atendimento" : "atendimentos"}`}
          />
          <Indicador
            rotulo="Ocupação da agenda"
            valor={porcentagem(geral.ocupacao)}
            icone={<CalendarClock size={22} />}
            detalhe={
              geral.ocupacao === null
                ? "Cadastre o expediente em Equipe"
                : `${formatarDuracao(geral.minutosOcupados)} agendadas de ${formatarDuracao(geral.minutosCapacidade)}`
            }
          />
          <Indicador
            rotulo="Faltas"
            valor={porcentagem(geral.taxaFaltas)}
            icone={<UserX size={22} />}
            tomIcone={geral.taxaFaltas !== null && geral.taxaFaltas >= 0.1 ? "perigo" : undefined}
            detalhe={
              finalizados > 0
                ? `${geral.faltas} de ${finalizados} ${finalizados === 1 ? "atendimento" : "atendimentos"}`
                : "Nenhum atendimento terminou ainda"
            }
          />
          <Indicador
            rotulo="Cancelamentos"
            valor={porcentagem(geral.taxaCancelamento)}
            icone={<CalendarX2 size={22} />}
            detalhe={`${geral.cancelados} de ${geral.agendados} ${geral.agendados === 1 ? "agendamento" : "agendamentos"}`}
          />
        </section>

        <section className="card card-sem-padding" aria-labelledby="titulo-por-profissional">
          <div className="card-cabecalho">
            <div>
              <h2 id="titulo-por-profissional" className="card-titulo">
                Por profissional
              </h2>
              <p className="card-descricao">
                Ticket médio: o que entrou no caixa por atendimento concluído. Faltas: sobre os atendimentos que já
                terminaram (concluídos ou falta). Ocupação: tempo agendado sobre o expediente, sem almoço, folgas e
                férias.
              </p>
            </div>
          </div>
          <div className="tabela-wrap">
            <table className="tabela tabela-responsiva">
              <thead>
                <tr>
                  <th scope="col">Profissional</th>
                  <th scope="col" className="alinhar-direita">
                    Atendimentos
                  </th>
                  <th scope="col" className="alinhar-direita">
                    Ticket médio
                  </th>
                  <th scope="col" className="alinhar-direita">
                    Faltas
                  </th>
                  <th scope="col" className="alinhar-direita">
                    Ocupação
                  </th>
                </tr>
              </thead>
              <tbody>
                {porProfissional.map((p) => (
                  <tr key={p.id}>
                    <td className="tabela-td-principal">
                      <div className="tabela-celula-link">
                        <Avatar nome={p.nome} tamanho={32} />
                        <span className="tabela-celula-principal">{p.nome}</span>
                        {!p.ativo && <Badge tom="atencao">Inativo</Badge>}
                      </div>
                    </td>
                    <td data-rotulo="Atendimentos" className="alinhar-direita num">
                      {p.concluidos}
                      <span className="texto-secundario texto-pequeno"> de {p.agendados - p.cancelados}</span>
                    </td>
                    <td data-rotulo="Ticket médio" className="alinhar-direita num">
                      {p.ticketMedio === null ? "—" : formatarMoeda(p.ticketMedio)}
                    </td>
                    <td data-rotulo="Faltas" className="alinhar-direita num">
                      {porcentagem(p.taxaFaltas)}
                      {p.faltas > 0 && <span className="texto-secundario texto-pequeno"> ({p.faltas})</span>}
                    </td>
                    <td data-rotulo="Ocupação" className="alinhar-direita">
                      <Ocupacao ind={p} nome={p.nome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
