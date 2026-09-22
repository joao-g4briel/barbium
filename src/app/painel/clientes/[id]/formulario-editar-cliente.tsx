"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FormularioEditarCliente({
  clienteId,
  nomeInicial,
  telefoneInicial,
}: {
  clienteId: string;
  nomeInicial: string;
  telefoneInicial: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setSalvando(true);

    const resposta = await fetch(`/api/painel/clientes/${clienteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone }),
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
    <div className="card" style={{ display: "grid", gap: 16 }}>
      <div>
        <label htmlFor="nome">Nome</label>
        <input id="nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label htmlFor="telefone">Telefone</label>
        <input
          id="telefone"
          className="input"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>

      {erro && <p className="erro-form">{erro}</p>}

      <button className="btn btn-ghost btn-sm" onClick={salvar} disabled={salvando} style={{ justifySelf: "start" }}>
        {salvando ? "Salvando…" : "Salvar dados"}
      </button>
    </div>
  );
}
