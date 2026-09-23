import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import {
  intervaloPeriodo,
  periodoValido,
  ROTULO_PERIODO,
  type PeriodoCaixa,
} from "@/lib/periodo-caixa";
import { FUSO_BRASIL } from "@/lib/fuso-brasil";
import { BotaoExcluirLancamento } from "./botao-excluir-lancamento";

function formatarPreco(valor: unknown): string {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PaginaCaixa({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const { periodo: periodoParam } = await searchParams;
  const periodo = periodoValido(periodoParam);
  const { inicio, fim } = intervaloPeriodo(periodo);

  const lancamentos = await prisma.caixaLancamento.findMany({
    where: { barbeariaId: sessao.barbeariaId, criadoEm: { gte: inicio, lte: fim } },
    orderBy: { criadoEm: "desc" },
  });

  const entradas = lancamentos
    .filter((l) => l.tipo === "ENTRADA")
    .reduce((soma, l) => soma + Number(l.valor), 0);
  const saidas = lancamentos
    .filter((l) => l.tipo === "SAIDA")
    .reduce((soma, l) => soma + Number(l.valor), 0);
  const saldo = entradas - saidas;

  const periodos: PeriodoCaixa[] = ["hoje", "semana", "mes"];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Caixa</h1>
        <Link href="/painel/caixa/novo" className="btn btn-primary">
          Novo lançamento
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {periodos.map((p) => (
          <Link
            key={p}
            href={`/painel/caixa?periodo=${p}`}
            className="btn btn-ghost btn-sm"
            style={{
              borderColor: p === periodo ? "var(--neon)" : undefined,
              color: p === periodo ? "var(--neon)" : undefined,
            }}
          >
            {ROTULO_PERIODO[p]}
          </Link>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 16,
        }}
      >
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>Entradas</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 900, margin: "8px 0 0", color: "var(--neon)" }}>
            {formatarPreco(entradas)}
          </p>
        </div>
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>Saídas</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 900, margin: "8px 0 0", color: "var(--danger)" }}>
            {formatarPreco(saidas)}
          </p>
        </div>
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>Saldo</p>
          <p style={{ fontSize: "1.5rem", fontWeight: 900, margin: "8px 0 0" }}>
            {formatarPreco(saldo)}
          </p>
        </div>
      </div>

      {lancamentos.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>Nenhum lançamento nesse período.</p>
        </div>
      ) : (
        <div className="item-list">
          {lancamentos.map((lancamento) => (
            <div key={lancamento.id} className="card item-row">
              <div className="item-row-main">
                <div className="item-row-title">{lancamento.descricao ?? "Lançamento"}</div>
                <div className="item-row-sub">
                  {lancamento.criadoEm.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: FUSO_BRASIL,
                  })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className={lancamento.tipo === "ENTRADA" ? "badge badge-ativo" : "badge badge-inativo"}>
                  {lancamento.tipo === "ENTRADA" ? "+" : "−"} {formatarPreco(lancamento.valor)}
                </span>
                {!lancamento.agendamentoId && <BotaoExcluirLancamento id={lancamento.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
