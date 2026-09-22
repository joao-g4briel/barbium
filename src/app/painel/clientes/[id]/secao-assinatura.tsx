"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  statusAssinatura,
  ROTULO_STATUS_ASSINATURA,
  ROTULO_PERIODICIDADE,
  type StatusAssinatura,
} from "@/lib/assinatura";

interface Props {
  clienteId: string;
  tipoAtual: "MENSAL" | "TRIMESTRAL" | null;
  valorAtual: number | null;
  vencimentoAtual: string | null; // ISO
}

function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function classeBadge(status: StatusAssinatura): string {
  if (status === "ATIVA") return "badge badge-ativo";
  if (status === "VENCIDA") return "badge badge-inativo";
  return "badge";
}

export function SecaoAssinatura({ clienteId, tipoAtual, valorAtual, vencimentoAtual }: Props) {
  const router = useRouter();
  const vencimentoData = vencimentoAtual ? new Date(vencimentoAtual) : null;
  const status = statusAssinatura(vencimentoData);
  const temAssinatura = status !== "SEM_ASSINATURA";

  const [tipo, setTipo] = useState<"MENSAL" | "TRIMESTRAL">(tipoAtual ?? "MENSAL");
  const [valor, setValor] = useState(valorAtual != null ? String(valorAtual) : "");
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  async function ativarOuRenovar() {
    setErro(null);
    setProcessando(true);

    const resposta = await fetch(`/api/painel/clientes/${clienteId}/assinatura`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, valor: Number(valor), dataInicio }),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível salvar.");
      setProcessando(false);
      return;
    }

    setProcessando(false);
    router.refresh();
  }

  async function cancelar() {
    setProcessando(true);
    const resposta = await fetch(`/api/painel/clientes/${clienteId}/assinatura`, {
      method: "DELETE",
    });
    setProcessando(false);
    if (resposta.ok) router.refresh();
  }

  return (
    <div className="card" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: 0 }}>Assinatura</h2>
        <span className={classeBadge(status)}>{ROTULO_STATUS_ASSINATURA[status]}</span>
      </div>

      {temAssinatura && tipoAtual && valorAtual != null && vencimentoData && (
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {ROTULO_PERIODICIDADE[tipoAtual]} · {formatarPreco(valorAtual)} · vence em{" "}
          {formatarData(vencimentoData)}
        </p>
      )}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label htmlFor="tipo">Periodicidade</label>
          <select
            id="tipo"
            className="input"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "MENSAL" | "TRIMESTRAL")}
          >
            <option value="MENSAL">Mensal</option>
            <option value="TRIMESTRAL">Trimestral</option>
          </select>
        </div>
        <div>
          <label htmlFor="valor">Valor (R$)</label>
          <input
            id="valor"
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
      </div>

      {!temAssinatura && (
        <div>
          <label htmlFor="dataInicio">Início</label>
          <input
            id="dataInicio"
            type="date"
            className="input"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
      )}

      {erro && <p className="erro-form">{erro}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={ativarOuRenovar}
          disabled={processando || !valor}
        >
          {processando ? "Salvando…" : temAssinatura ? "Renovar assinatura" : "Ativar assinatura"}
        </button>
        {temAssinatura && (
          <button className="btn btn-ghost btn-sm" onClick={cancelar} disabled={processando}>
            Cancelar assinatura
          </button>
        )}
      </div>
    </div>
  );
}
