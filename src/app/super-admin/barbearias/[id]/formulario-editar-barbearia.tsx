"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANOS, ROTULO_PLANO } from "@/lib/planos";
import type { Plano } from "@prisma/client";

interface Props {
  barbeariaId: string;
  planoAtual: Plano;
  ativoAtual: boolean;
}

export function FormularioEditarBarbearia({ barbeariaId, planoAtual, ativoAtual }: Props) {
  const router = useRouter();
  const [plano, setPlano] = useState<Plano>(planoAtual);
  const [ativo, setAtivo] = useState(ativoAtual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);

    const resposta = await fetch(`/api/super-admin/barbearias/${barbeariaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plano, ativo }),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível salvar.");
      setSalvando(false);
      return;
    }

    setSalvando(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <div>
        <label htmlFor="plano">Plano</label>
        <select
          id="plano"
          className="input"
          value={plano}
          onChange={(e) => setPlano(e.target.value as Plano)}
        >
          {PLANOS.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PLANO[p]}
            </option>
          ))}
        </select>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <span style={{ color: "var(--text)" }}>Barbearia ativa</span>
      </label>
      <p style={{ color: "var(--muted)", fontSize: "0.8125rem", margin: 0 }}>
        Desmarcando, ninguém da equipe dessa barbearia consegue mais fazer login.
      </p>

      {erro && <p className="erro-form">{erro}</p>}

      <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar alterações"}
      </button>
    </div>
  );
}
