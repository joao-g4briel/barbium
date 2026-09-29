import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  CalendarX2,
  CheckCircle2,
  CircleSlash,
  Clock,
  Receipt,
  Wallet,
} from "lucide-react";
import { obterSessao } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { inicioDoDiaBrasil, horarioBrasil } from "@/lib/fuso-brasil";
import {
  capitalizar,
  formatarDataInstante,
  formatarHora,
  formatarMoeda,
  formatarTempoAte,
} from "@/lib/formatar";
import { INCLUIR_AGENDAMENTO_COMPLETO, paraAgendamentoVM } from "@/lib/agenda-vm";
import { obterAssinaturasAVencer } from "@/lib/dashboard-painel";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { Indicador } from "@/components/ui/indicador";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { AgendaInterativa } from "@/components/agenda/agenda-interativa";
import { BotaoNovoAgendamento } from "@/components/agenda/botao-novo-agendamento";

export const metadata: Metadata = { title: "Visão geral" };

export default async function VisaoGeral({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // A agenda morava em /painel?visualizacao=…&data=…; links antigos seguem
  // funcionando e caem na agenda nova.
  const params = await searchParams;
  if (params.visualizacao || params.data || params.de || params.ate) {
    const busca = new URLSearchParams();
    for (const chave of ["visualizacao", "data", "de", "ate"]) {
      const valor = params[chave];
      if (valor) busca.set(chave, valor);
    }
    redirect(`/painel/agenda?${busca.toString()}`);
  }

  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;
  const barbeariaId = sessao.barbeariaId;
  const souDono = sessao.role === "DONO";

  const agora = new Date();
  const hoje = inicioDoDiaBrasil(agora);
  const inicioHoje = horarioBrasil(hoje, 0);
  const fimHoje = new Date(horarioBrasil(hoje, 24 * 60).getTime() - 1);

  const [barbearia, agendamentos, profissionais, entradasHoje, ultimosLancamentos, assinaturas] = await Promise.all([
    obterBarbearia(barbeariaId),
    prisma.agendamento.findMany({
      where: {
        barbeariaId,
        inicio: { gte: inicioHoje, lte: fimHoje },
        ...(souDono ? {} : { barbeiroId: sessao.sub }),
      },
      orderBy: { inicio: "asc" },
      include: INCLUIR_AGENDAMENTO_COMPLETO,
    }),
    souDono
      ? prisma.usuario.findMany({
          where: { barbeariaId, ativo: true, role: { in: ["DONO", "BARBEIRO"] } },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    souDono
      ? prisma.caixaLancamento.aggregate({
          where: { barbeariaId, tipo: "ENTRADA", criadoEm: { gte: inicioHoje, lte: fimHoje } },
          _sum: { valor: true },
        })
      : Promise.resolve(null),
    souDono
      ? prisma.caixaLancamento.findMany({
          where: { barbeariaId },
          orderBy: { criadoEm: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    souDono ? obterAssinaturasAVencer(barbeariaId) : Promise.resolve([]),
  ]);

  const ativos = agendamentos.filter((a) => a.status !== "CANCELADO");
  const concluidos = agendamentos.filter((a) => a.status === "CONCLUIDO");
  const confirmados = agendamentos.filter((a) => a.status === "CONFIRMADO");
  const cancelados = agendamentos.filter((a) => a.status === "CANCELADO").length;
  const faltas = agendamentos.filter((a) => a.status === "FALTA").length;

  // Recebido = o que já entrou no caixa hoje (concluir um atendimento lança
  // a entrada automaticamente). A receber = confirmados de hoje que ainda
  // não foram concluídos — é previsão, não dinheiro em caixa.
  const recebido = Number(entradasHoje?._sum.valor ?? 0);
  const aReceber = confirmados.reduce((soma, a) => soma + Number(a.servico.preco), 0);

  const proximos = confirmados.filter((a) => a.fim > agora).slice(0, 4);
  const mostrarGrade = souDono && profissionais.length >= 2;

  return (
    <>
      <CabecalhoPagina
        titulo="Visão geral"
        descricao={`Hoje, ${formatarDataInstante(agora, { weekday: "long", day: "2-digit", month: "long" })}`}
        acoes={<BotaoNovoAgendamento slug={barbearia?.slug} />}
      />

      <div className="pilha">
        <section aria-label="Resumo de hoje" className="indicadores">
          {souDono ? (
            <Indicador
              rotulo="Recebido hoje"
              valor={formatarMoeda(recebido)}
              tomValor={recebido > 0 ? "positivo" : undefined}
              icone={<Wallet size={22} />}
              tomIcone="primario"
              detalhe={
                aReceber > 0
                  ? `${formatarMoeda(aReceber)} a receber de ${confirmados.length} ${confirmados.length === 1 ? "confirmado" : "confirmados"}`
                  : "Nada pendente para hoje"
              }
            />
          ) : (
            <Indicador
              rotulo="Pela frente"
              valor={proximos.length}
              icone={<Clock size={22} />}
              tomIcone="primario"
              detalhe={proximos[0] ? `Próximo às ${formatarHora(proximos[0].inicio)}` : "Nenhum atendimento restante"}
            />
          )}
          <Indicador
            rotulo="Agendamentos"
            valor={ativos.length}
            icone={<CalendarCheck size={22} />}
            detalhe={`${confirmados.length} ${confirmados.length === 1 ? "confirmado" : "confirmados"}`}
          />
          <Indicador
            rotulo="Concluídos"
            valor={concluidos.length}
            icone={<CheckCircle2 size={22} />}
            detalhe={ativos.length > 0 ? `de ${ativos.length} ${ativos.length === 1 ? "agendamento" : "agendamentos"}` : "Nenhum atendimento ainda"}
          />
          <Indicador
            rotulo="Cancelamentos"
            valor={cancelados + faltas}
            icone={<CircleSlash size={22} />}
            detalhe={`${cancelados} ${cancelados === 1 ? "cancelado" : "cancelados"} · ${faltas} ${faltas === 1 ? "falta" : "faltas"}`}
          />
        </section>

        <div className="grade-painel grade-painel-2-1">
          <section className="card card-sem-padding" aria-labelledby="titulo-agenda-hoje">
            <div className="card-cabecalho">
              <h2 id="titulo-agenda-hoje" className="card-titulo">
                Agenda de hoje
              </h2>
              <Link href="/painel/agenda" className="link texto-pequeno">
                Abrir agenda <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className={agendamentos.length > 0 ? "card-corpo" : undefined}>
              <AgendaInterativa
                emCard
                grupos={[{ chave: "hoje", rotulo: "", itens: agendamentos.map(paraAgendamentoVM) }]}
                agora={agora.toISOString()}
                mostrarProfissional={souDono}
                grade={mostrarGrade ? { inicioDia: inicioHoje.toISOString(), profissionais } : null}
                vazio={
                  <EstadoVazio
                    icone={<CalendarX2 size={22} />}
                    titulo="Nenhum agendamento hoje"
                    descricao="Compartilhe o link de agendamento da barbearia para receber novos horários."
                  />
                }
              />
            </div>
          </section>

          <section className="card card-sem-padding" aria-labelledby="titulo-proximos">
            <div className="card-cabecalho">
              <h2 id="titulo-proximos" className="card-titulo">
                Próximos clientes
              </h2>
              <Link href="/painel/agenda" className="link texto-pequeno">
                Ver agenda <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            {proximos.length === 0 ? (
              <EstadoVazio
                compacto
                icone={<Clock size={22} />}
                titulo="Nenhum atendimento pela frente"
                descricao={ativos.length > 0 ? "Todos os horários de hoje já passaram." : "Não há agendamentos para hoje."}
              />
            ) : (
              <ol className="proximos" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {proximos.map((a) => {
                  const minutos = (a.inicio.getTime() - agora.getTime()) / 60000;
                  return (
                    <li key={a.id} className="proximo">
                      <div>
                        <time className="proximo-hora" dateTime={a.inicio.toISOString()}>
                          {formatarHora(a.inicio)}
                        </time>
                        <p className="proximo-relativo">{capitalizar(formatarTempoAte(minutos))}</p>
                      </div>
                      <div className="proximo-texto">
                        <p className="lista-item-titulo">{a.cliente.nome}</p>
                        <p className="lista-item-sub">
                          {a.servico.nome}
                          {souDono && ` · ${a.barbeiro.nome}`}
                        </p>
                      </div>
                      {minutos <= 0 ? (
                        <Badge tom="sucesso" icone={<Clock size={13} strokeWidth={2.2} aria-hidden="true" />}>
                          Agora
                        </Badge>
                      ) : (
                        <StatusBadge status={a.status} />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {souDono && (
          <div className={`grade-painel${assinaturas.length > 0 ? " grade-painel-2-1" : ""}`}>
            <section className="card card-sem-padding" aria-labelledby="titulo-lancamentos">
              <div className="card-cabecalho">
                <h2 id="titulo-lancamentos" className="card-titulo">
                  Últimos lançamentos
                </h2>
                <Link href="/painel/caixa" className="link texto-pequeno">
                  Ver financeiro <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              {ultimosLancamentos.length === 0 ? (
                <EstadoVazio
                  compacto
                  icone={<Receipt size={22} />}
                  titulo="Nenhum lançamento ainda"
                  descricao="Atendimentos concluídos entram no caixa automaticamente."
                />
              ) : (
                <div className="tabela-wrap">
                  <table className="tabela tabela-responsiva">
                    <thead>
                      <tr>
                        <th scope="col">Descrição</th>
                        <th scope="col">Data</th>
                        <th scope="col">Origem</th>
                        <th scope="col" className="alinhar-direita">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimosLancamentos.map((l) => (
                        <tr key={l.id}>
                          <td className="tabela-td-principal tabela-celula-principal">{l.descricao ?? "Lançamento"}</td>
                          <td data-rotulo="Data" className="num">
                            <span>
                              {formatarDataInstante(l.criadoEm, { day: "2-digit", month: "2-digit" })}{" "}
                              <span className="texto-secundario">{formatarHora(l.criadoEm)}</span>
                            </span>
                          </td>
                          <td data-rotulo="Origem" className="texto-secundario">
                            {l.agendamentoId ? "Atendimento" : "Manual"}
                          </td>
                          <td data-rotulo="Valor" className="alinhar-direita tabela-celula-principal">
                            <span style={{ color: l.tipo === "ENTRADA" ? "var(--color-primary)" : "var(--color-text)" }}>
                              {l.tipo === "ENTRADA" ? "+ " : "− "}
                              {formatarMoeda(Number(l.valor))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {assinaturas.length > 0 && (
              <section className="card card-sem-padding" aria-labelledby="titulo-assinaturas">
                <div className="card-cabecalho">
                  <div>
                    <h2 id="titulo-assinaturas" className="card-titulo">
                      Assinaturas a vencer
                    </h2>
                    <p className="card-descricao">Vencidas ou vencendo nos próximos 7 dias</p>
                  </div>
                </div>
                <div className="lista">
                  {assinaturas.map((a) => (
                    <Link key={a.id} href={`/painel/clientes/${a.id}`} className="lista-item">
                      <div className="lista-item-principal">
                        <p className="lista-item-titulo">{a.nome}</p>
                        <p className="lista-item-sub">
                          {a.vencida ? "Venceu em " : "Vence em "}
                          {formatarDataInstante(a.vencimento, { day: "2-digit", month: "2-digit" })}
                        </p>
                      </div>
                      <Badge tom={a.vencida ? "atencao" : "info"}>{a.vencida ? "Vencida" : "Vencendo"}</Badge>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
