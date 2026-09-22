"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function FormularioNovoCliente() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    const resposta = await fetch("/api/painel/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      setErro(dados.erro ?? "Não foi possível criar o cliente.");
      setSalvando(false);
      return;
    }

    router.push(`/painel/clientes/${dados.cliente.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={aoEnviar} className="card" style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <div>
        <label htmlFor="nome">Nome</label>
        <input
          id="nome"
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="telefone">Telefone (com DDD)</label>
        <input
          id="telefone"
          className="input"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 91234-5678"
          required
        />
      </div>

      {erro && <p className="erro-form">{erro}</p>}

      <button type="submit" className="btn btn-primary" disabled={salvando}>
        {salvando ? "Salvando…" : "Cadastrar cliente"}
      </button>
    </form>
  );
}
