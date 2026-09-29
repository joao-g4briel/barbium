import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { obterSessao } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { inicioDoDiaBrasil, horarioBrasil } from "@/lib/fuso-brasil";
import { capitalizar, formatarDiaCalendario } from "@/lib/formatar";
import { INCLUIR_AGENDAMENTO_COMPLETO, paraAgendamentoVM } from "@/lib/agenda-vm";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { Abas } from "@/components/ui/abas";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { AgendaInterativa } from "@/components/agenda/agenda-interativa";
import { FiltroProfissional } from "@/components/agenda/filtro-profissional";
import { BotaoNovoAgendamento } from "@/components/agenda/botao-novo-agendamento";
import type { GrupoAgendaVM } from "@/components/agenda/tipos";

export const metadata: Metadata = { title: "Agenda" };

type Visualizacao = "dia" | "semana" | "mes" | "periodo";

const ROTULO_ABA: Record<Visualizacao, string> = {
  dia: "Dia",
  semana: "Semana",
  mes: "Mês",
  periodo: "Período",
};

// Estas datas representam só um DIA DE CALENDÁRIO (meia-noite UTC que já
// significa "esse dia em Brasília" — ver fuso-brasil.ts), não um instante
// real. Por isso são formatadas com timeZone "UTC": ler os componentes
// como estão, sem converter de novo — converter de novo é o mesmo tipo de
// bug de 3 horas que já corrigimos, só que ao contrário.
function chaveDia(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function parseDataParam(valor: string | undefined): Date {
  if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
  }
  return inicioDoDiaBrasil(new Date());
}

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
}

function somarMeses(data: Date, meses: number): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + meses, 1));
}

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ visualizacao?: string; data?: string; de?: string; ate?: string; profissional?: string }>;
}) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const params = await searchParams;
  const visualizacao: Visualizacao =
    params.visualizacao === "semana" || params.visualizacao === "mes" || params.visualizacao === "periodo"
      ? params.visualizacao
      : "dia";

  const souDono = sessao.role === "DONO";
  const dataRef = parseDataParam(params.data);
  const hoje = inicioDoDiaBrasil(new Date());

  // Primeiro e último DIA DE CALENDÁRIO do período. Calculados direto, sem
  // os helpers de fuso: dataRef já é um dia puro de calendário, e os helpers
  // inicioDaSemanaBrasil/fimDaSemanaBrasil esperam um instante real —
  // usá-los aqui empurraria a semana inteira um domingo pra trás.
  let diaInicio: Date;
  let diaFim: Date;
  if (visualizacao === "semana") {
    diaInicio = somarDias(dataRef, -dataRef.getUTCDay());
    diaFim = somarDias(diaInicio, 6);
  } else if (visualizacao === "mes") {
    diaInicio = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth(), 1));
    diaFim = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth() + 1, 0));
  } else if (visualizacao === "periodo") {
    diaInicio = params.de ? parseDataParam(params.de) : hoje;
    diaFim = params.ate ? parseDataParam(params.ate) : hoje;
  } else {
    diaInicio = dataRef;
    diaFim = dataRef;
  }

  // A consulta usa os instantes reais em Brasília (00:00 do primeiro dia até
  // 23:59:59 do último). Consultar da meia-noite UTC jogava atendimentos
  // depois das 21h pro dia seguinte.
  const inicio = horarioBrasil(diaInicio, 0);
  const fim = new Date(horarioBrasil(diaFim, 24 * 60).getTime() - 1);

  const [barbearia, profissionais] = await Promise.all([
    obterBarbearia(sessao.barbeariaId),
    souDono
      ? prisma.usuario.findMany({
          where: { barbeariaId: sessao.barbeariaId, ativo: true, role: { in: ["DONO", "BARBEIRO"] } },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // Filtro por profissional só existe pro dono — o barbeiro já vê só a própria agenda.
  const filtroProfissional =
    souDono && params.profissional && profissionais.some((p) => p.id === params.profissional)
      ? params.profissional
      : null;

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      barbeariaId: sessao.barbeariaId,
      inicio: { gte: inicio, lte: fim },
      ...(sessao.role === "BARBEIRO"
        ? { barbeiroId: sessao.sub }
        : filtroProfissional
          ? { barbeiroId: filtroProfissional }
          : {}),
    },
    orderBy: { inicio: "asc" },
    include: INCLUIR_AGENDAMENTO_COMPLETO,
  });

  // Links preservam o filtro de profissional ao navegar.
  function href(extra: Record<string, string>): string {
    const busca = new URLSearchParams(extra);
    if (filtroProfissional) busca.set("profissional", filtroProfissional);
    return `/painel/agenda?${busca.toString()}`;
  }

  let grupos: GrupoAgendaVM[];
  if (visualizacao === "dia") {
    grupos = [{ chave: chaveDia(dataRef), rotulo: "", itens: agendamentos.map(paraAgendamentoVM) }];
  } else {
    const porDia = new Map<string, GrupoAgendaVM>();
    for (const agendamento of agendamentos) {
      const dia = inicioDoDiaBrasil(agendamento.inicio);
      const chave = chaveDia(dia);
      if (!porDia.has(chave)) {
        porDia.set(chave, {
          chave,
          rotulo: capitalizar(formatarDiaCalendario(dia, { weekday: "long", day: "2-digit", month: "long" })),
          itens: [],
        });
      }
      porDia.get(chave)!.itens.push(paraAgendamentoVM(agendamento));
    }
    grupos = [...porDia.values()];
  }

  const ativos = agendamentos.filter((a) => a.status !== "CANCELADO");
  const concluidos = agendamentos.filter((a) => a.status === "CONCLUIDO").length;
  const cancelados = agendamentos.length - ativos.length;

  const mostrarGrade = visualizacao === "dia" && souDono && !filtroProfissional && profissionais.length >= 2;

  // Rótulo do período e navegação anterior/próximo.
  let rotuloPeriodo = "";
  let hrefAnterior = "";
  let hrefProximo = "";
  if (visualizacao === "dia") {
    rotuloPeriodo = capitalizar(formatarDiaCalendario(dataRef, { weekday: "long", day: "2-digit", month: "long" }));
    hrefAnterior = href({ data: chaveDia(somarDias(dataRef, -1)) });
    hrefProximo = href({ data: chaveDia(somarDias(dataRef, 1)) });
  } else if (visualizacao === "semana") {
    rotuloPeriodo = `${formatarDiaCalendario(diaInicio, { day: "2-digit", month: "short" })} – ${formatarDiaCalendario(diaFim, { day: "2-digit", month: "short" })}`;
    hrefAnterior = href({ visualizacao: "semana", data: chaveDia(somarDias(diaInicio, -7)) });
    hrefProximo = href({ visualizacao: "semana", data: chaveDia(somarDias(diaInicio, 7)) });
  } else if (visualizacao === "mes") {
    rotuloPeriodo = capitalizar(formatarDiaCalendario(diaInicio, { month: "long", year: "numeric" }));
    hrefAnterior = href({ visualizacao: "mes", data: chaveDia(somarMeses(diaInicio, -1)) });
    hrefProximo = href({ visualizacao: "mes", data: chaveDia(somarMeses(diaInicio, 1)) });
  } else {
    rotuloPeriodo = `${formatarDiaCalendario(diaInicio)} – ${formatarDiaCalendario(diaFim)}`;
  }

  const inicioSemana = somarDias(dataRef, -dataRef.getUTCDay());
  const diasSemana = Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i));
  const naoEstaEmHoje =
    visualizacao === "dia" ? chaveDia(dataRef) !== chaveDia(hoje) : visualizacao !== "periodo";

  const parametrosAtuais: Record<string, string> = {};
  if (visualizacao !== "dia") parametrosAtuais.visualizacao = visualizacao;
  if (params.data) parametrosAtuais.data = params.data;
  if (params.de) parametrosAtuais.de = params.de;
  if (params.ate) parametrosAtuais.ate = params.ate;

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda"
        descricao={rotuloPeriodo}
        acoes={<BotaoNovoAgendamento slug={barbearia?.slug} />}
      />

      <div className="agenda-topo">
        <div className="barra-ferramentas" style={{ marginBottom: 0 }}>
          <Abas
            rotulo="Período da agenda"
            itens={(Object.keys(ROTULO_ABA) as Visualizacao[]).map((v) => ({
              href: href(v === "dia" ? { data: chaveDia(dataRef) } : { visualizacao: v, data: chaveDia(dataRef) }),
              rotulo: ROTULO_ABA[v],
              ativo: v === visualizacao,
            }))}
          />
          {souDono && profissionais.length > 1 && (
            <FiltroProfissional
              profissionais={profissionais}
              valor={filtroProfissional ?? ""}
              caminho="/painel/agenda"
              parametros={parametrosAtuais}
            />
          )}
        </div>

        {visualizacao === "periodo" ? (
          <form method="get" action="/painel/agenda" className="card form-grade form-grade-2" style={{ alignItems: "end" }}>
            <input type="hidden" name="visualizacao" value="periodo" />
            {filtroProfissional && <input type="hidden" name="profissional" value={filtroProfissional} />}
            <div className="campo">
              <label htmlFor="de" className="campo-rotulo">
                De
              </label>
              <input id="de" type="date" name="de" className="input" defaultValue={params.de ?? ""} required />
            </div>
            <div className="campo">
              <label htmlFor="ate" className="campo-rotulo">
                Até
              </label>
              <input id="ate" type="date" name="ate" className="input" defaultValue={params.ate ?? ""} required />
            </div>
            <div>
              <button type="submit" className="btn btn-primary">
                Ver período
              </button>
            </div>
          </form>
        ) : (
          <div className="agenda-navegacao">
            <Link href={hrefAnterior} className="btn btn-secondary btn-icone" aria-label="Período anterior">
              <ChevronLeft size={20} aria-hidden="true" />
            </Link>
            <Link href={hrefProximo} className="btn btn-secondary btn-icone" aria-label="Próximo período">
              <ChevronRight size={20} aria-hidden="true" />
            </Link>
            {naoEstaEmHoje && (
              <Link href={href(visualizacao === "dia" ? {} : { visualizacao })} className="btn btn-secondary">
                {visualizacao === "semana" ? "Esta semana" : visualizacao === "mes" ? "Este mês" : "Hoje"}
              </Link>
            )}
          </div>
        )}

        {visualizacao === "dia" && (
          <nav className="faixa-dias" aria-label="Dias da semana">
            {diasSemana.map((dia) => {
              const chave = chaveDia(dia);
              return (
                <Link
                  key={chave}
                  href={href({ data: chave })}
                  className="faixa-dia"
                  aria-current={chave === chaveDia(dataRef) ? "date" : undefined}
                  data-hoje={chave === chaveDia(hoje) || undefined}
                  aria-label={capitalizar(formatarDiaCalendario(dia, { weekday: "long", day: "2-digit", month: "long" }))}
                >
                  <span>{capitalizar(formatarDiaCalendario(dia, { weekday: "short" }).replace(".", ""))}</span>
                  <span className="faixa-dia-numero">{formatarDiaCalendario(dia, { day: "2-digit" })}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <p className="resumo-linha" aria-live="polite">
          {ativos.length} {ativos.length === 1 ? "agendamento" : "agendamentos"} · {concluidos}{" "}
          {concluidos === 1 ? "concluído" : "concluídos"}
          {cancelados > 0 && ` · ${cancelados} ${cancelados === 1 ? "cancelado" : "cancelados"}`}
        </p>
      </div>

      <AgendaInterativa
          grupos={grupos}
          agora={new Date().toISOString()}
          mostrarProfissional={souDono && !filtroProfissional}
          grade={
            mostrarGrade
              ? { inicioDia: horarioBrasil(dataRef, 0).toISOString(), profissionais }
              : null
          }
          vazio={
            <div className="card">
              <EstadoVazio
                icone={<CalendarX2 size={22} />}
                titulo={visualizacao === "dia" ? "Nenhum agendamento neste dia" : "Nenhum agendamento neste período"}
                descricao="Os horários marcados pelo link de agendamento aparecem aqui automaticamente."
                acao={<BotaoNovoAgendamento slug={barbearia?.slug} />}
              />
            </div>
          }
        />
    </>
  );
}
