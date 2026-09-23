import Link from "next/link";
import { obterSessao } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import {
  inicioDoDiaBrasil,
  fimDoDiaBrasil,
  fimDesseDiaCalendario,
  FUSO_BRASIL,
} from "@/lib/fuso-brasil";
import { ROTULO_STATUS, classeBadgeStatus } from "@/lib/status-agendamento";
import { AcoesAgendamento } from "@/components/acoes-agendamento";
import type { Agendamento, Cliente, Servico, Usuario } from "@prisma/client";

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

function rotuloDiaCompleto(data: Date): string {
  const rotulo = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

function rotuloDiaCurto(data: Date): string {
  const rotulo = data.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
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

type AgendamentoCompleto = Agendamento & { cliente: Cliente; servico: Servico; barbeiro: Usuario };

function LinhaAgendamento({ agendamento, mostrarBarbeiro }: { agendamento: AgendamentoCompleto; mostrarBarbeiro: boolean }) {
  return (
    <div className="card item-row">
      <div className="item-row-main">
        <div className="item-row-title">
          {agendamento.inicio.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: FUSO_BRASIL,
          })}{" "}
          — {agendamento.cliente.nome}
        </div>
        <div className="item-row-sub">
          {agendamento.servico.nome}
          {mostrarBarbeiro && ` · ${agendamento.barbeiro.nome}`}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className={classeBadgeStatus(agendamento.status)}>
          {ROTULO_STATUS[agendamento.status]}
        </span>
        <AcoesAgendamento id={agendamento.id} status={agendamento.status} />
      </div>
    </div>
  );
}

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<{ visualizacao?: string; data?: string; de?: string; ate?: string }>;
}) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const params = await searchParams;
  const visualizacao: Visualizacao =
    params.visualizacao === "semana" || params.visualizacao === "mes" || params.visualizacao === "periodo"
      ? params.visualizacao
      : "dia";

  const dataRef = parseDataParam(params.data);

  let inicio: Date;
  let fim: Date;

  if (visualizacao === "semana") {
    // Calculado direto aqui, sem os helpers de fuso: dataRef já é um dia
    // puro de calendário (sem precisar de conversão), e os helpers
    // inicioDaSemanaBrasil/fimDaSemanaBrasil esperam um instante real —
    // usá-los aqui empurraria a semana inteira um domingo pra trás, de
    // novo o mesmo tipo de bug que já corrigimos em outros lugares.
    const indiceDiaSemana = dataRef.getUTCDay(); // 0 = domingo
    inicio = somarDias(dataRef, -indiceDiaSemana);
    fim = fimDesseDiaCalendario(somarDias(inicio, 6));
  } else if (visualizacao === "mes") {
    // Mesma lógica: dataRef já é dia puro, não precisa (e não pode) passar
    // pelos helpers de conversão de fuso, que assumem um instante real.
    inicio = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth(), 1));
    fim = new Date(Date.UTC(dataRef.getUTCFullYear(), dataRef.getUTCMonth() + 1, 1) - 1);
  } else if (visualizacao === "periodo") {
    inicio = params.de ? parseDataParam(params.de) : inicioDoDiaBrasil(new Date());
    fim = params.ate ? fimDesseDiaCalendario(parseDataParam(params.ate)) : fimDoDiaBrasil(new Date());
  } else {
    inicio = dataRef;
    fim = fimDesseDiaCalendario(dataRef);
  }

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      barbeariaId: sessao.barbeariaId,
      inicio: { gte: inicio, lte: fim },
      ...(sessao.role === "BARBEIRO" ? { barbeiroId: sessao.sub } : {}),
    },
    orderBy: { inicio: "asc" },
    include: { cliente: true, servico: true, barbeiro: true },
  });

  const mostrarBarbeiro = sessao.role === "DONO";
  const agrupaPorDia = visualizacao !== "dia";

  const grupos = new Map<string, { data: Date; itens: AgendamentoCompleto[] }>();
  if (agrupaPorDia) {
    for (const agendamento of agendamentos) {
      const diaAg = inicioDoDiaBrasil(agendamento.inicio);
      const chave = chaveDia(diaAg);
      if (!grupos.has(chave)) grupos.set(chave, { data: diaAg, itens: [] });
      grupos.get(chave)!.itens.push(agendamento);
    }
  }
  const gruposOrdenados = [...grupos.values()].sort((a, b) => a.data.getTime() - b.data.getTime());

  // Rótulo do período e alvos de navegação (anterior/próximo), um por aba.
  let rotuloPeriodo = "";
  let hrefAnterior = "";
  let hrefProximo = "";

  if (visualizacao === "dia") {
    rotuloPeriodo = rotuloDiaCompleto(dataRef);
    hrefAnterior = `/painel?visualizacao=dia&data=${chaveDia(somarDias(dataRef, -1))}`;
    hrefProximo = `/painel?visualizacao=dia&data=${chaveDia(somarDias(dataRef, 1))}`;
  } else if (visualizacao === "semana") {
    const rotuloInicio = inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
    const rotuloFim = fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
    rotuloPeriodo = `${rotuloInicio} a ${rotuloFim}`;
    hrefAnterior = `/painel?visualizacao=semana&data=${chaveDia(somarDias(inicio, -7))}`;
    hrefProximo = `/painel?visualizacao=semana&data=${chaveDia(somarDias(inicio, 7))}`;
  } else if (visualizacao === "mes") {
    const rotuloMes = inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
    rotuloPeriodo = rotuloMes.charAt(0).toUpperCase() + rotuloMes.slice(1);
    hrefAnterior = `/painel?visualizacao=mes&data=${chaveDia(somarMeses(inicio, -1))}`;
    hrefProximo = `/painel?visualizacao=mes&data=${chaveDia(somarMeses(inicio, 1))}`;
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Agenda</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(Object.keys(ROTULO_ABA) as Visualizacao[]).map((v) => (
          <Link
            key={v}
            href={`/painel?visualizacao=${v}&data=${chaveDia(dataRef)}`}
            className="btn btn-ghost btn-sm"
            style={{
              borderColor: v === visualizacao ? "var(--neon)" : undefined,
              color: v === visualizacao ? "var(--neon)" : undefined,
            }}
          >
            {ROTULO_ABA[v]}
          </Link>
        ))}
      </div>

      {visualizacao === "periodo" ? (
        <form method="get" className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <input type="hidden" name="visualizacao" value="periodo" />
          <div>
            <label htmlFor="de">De</label>
            <input id="de" type="date" name="de" className="input" defaultValue={params.de ?? ""} />
          </div>
          <div>
            <label htmlFor="ate">Até</label>
            <input id="ate" type="date" name="ate" className="input" defaultValue={params.ate ?? ""} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Ver
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Link href={hrefAnterior} className="btn btn-ghost btn-sm">
            ← Anterior
          </Link>
          <strong style={{ textAlign: "center" }}>{rotuloPeriodo}</strong>
          <Link href={hrefProximo} className="btn btn-ghost btn-sm">
            Próximo →
          </Link>
        </div>
      )}

      {agendamentos.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>Nenhum agendamento nesse período.</p>
        </div>
      ) : agrupaPorDia ? (
        <div style={{ display: "grid", gap: 20 }}>
          {gruposOrdenados.map((grupo) => (
            <div key={chaveDia(grupo.data)}>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: "0 0 8px" }}>
                {rotuloDiaCurto(grupo.data)}
              </p>
              <div className="item-list">
                {grupo.itens.map((agendamento) => (
                  <LinhaAgendamento key={agendamento.id} agendamento={agendamento} mostrarBarbeiro={mostrarBarbeiro} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="item-list">
          {agendamentos.map((agendamento) => (
            <LinhaAgendamento key={agendamento.id} agendamento={agendamento} mostrarBarbeiro={mostrarBarbeiro} />
          ))}
        </div>
      )}
    </div>
  );
}
