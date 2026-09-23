"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Bloqueio {
  id: string;
  inicio: string; // ISO
  fim: string | null; // ISO ou null = indefinido
  motivo: string | null;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SecaoBloqueios({ bloqueiosIniciais }: { bloqueiosIniciais: Bloqueio[] }) {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // Sempre deriva da prop, nunca guarda cópia própria — router.refresh()
  // já traz a lista atualizada do servidor depois de cada ação.
  const travaAtiva = bloqueiosIniciais.find((b) => b.fim === null) ?? null;
  const periodosAgendados = bloqueiosIniciais.filter((b) => b.fim !== null);

  async function trancarAgora() {
    setProcessando(true);
    setErro(null);
    const resposta = await fetch("/api/painel/bloqueios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inicio: new Date().toISOString(),
        fim: null,
        motivo: "Trava de emergência",
      }),
    });
    setProcessando(false);
    if (resposta.ok) router.refresh();
  }

  async function excluir(id: string) {
    setProcessando(true);
    const resposta = await fetch(`/api/painel/bloqueios/${id}`, { method: "DELETE" });
    setProcessando(false);
    if (resposta.ok) router.refresh();
  }

  async function criarPeriodo() {
    if (!dataInicio || !dataFim) return;
    setErro(null);
    setProcessando(true);

    const inicio = new Date(`${dataInicio}T00:00:00`).toISOString();
    const fim = new Date(`${dataFim}T23:59:59`).toISOString();

    const resposta = await fetch("/api/painel/bloqueios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inicio, fim, motivo: motivo || undefined }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => null);
      setErro(corpo?.erro ?? "Não foi possível salvar.");
      setProcessando(false);
      return;
    }

    setProcessando(false);
    setMostrarForm(false);
    setDataInicio("");
    setDataFim("");
    setMotivo("");
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        className="card"
        style={{
          borderColor: travaAtiva ? "var(--danger)" : undefined,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {travaAtiva ? "Agenda trancada" : "Agenda aberta pra novos agendamentos"}
          </p>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "0.875rem" }}>
            {travaAtiva
              ? "Ninguém consegue marcar horário com você até destravar."
              : "Clientes conseguem agendar normalmente, dentro do seu expediente."}
          </p>
        </div>
        {travaAtiva ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => excluir(travaAtiva.id)}
            disabled={processando}
          >
            Destravar agenda
          </button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={trancarAgora} disabled={processando}>
            Trancar agenda agora
          </button>
        )}
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0 }}>
            Períodos de folga marcados
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? "Cancelar" : "+ Marcar período"}
          </button>
        </div>

        {mostrarForm && (
          <div className="card" style={{ display: "grid", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label htmlFor="dataInicio">De</label>
                <input
                  id="dataInicio"
                  type="date"
                  className="input"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="dataFim">Até</label>
                <input
                  id="dataFim"
                  type="date"
                  className="input"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="motivo">Motivo (opcional)</label>
              <input
                id="motivo"
                className="input"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: Férias"
              />
            </div>
            {erro && <p className="erro-form">{erro}</p>}
            <button
              className="btn btn-primary btn-sm"
              onClick={criarPeriodo}
              disabled={processando || !dataInicio || !dataFim}
              style={{ justifySelf: "start" }}
            >
              Salvar período
            </button>
          </div>
        )}

        {periodosAgendados.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Nenhum período marcado.</p>
        ) : (
          <div className="item-list">
            {periodosAgendados.map((b) => (
              <div key={b.id} className="card item-row">
                <div className="item-row-main">
                  <div className="item-row-title">
                    {formatarData(b.inicio)} até {formatarData(b.fim!)}
                  </div>
                  {b.motivo && <div className="item-row-sub">{b.motivo}</div>}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => excluir(b.id)}
                  disabled={processando}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
