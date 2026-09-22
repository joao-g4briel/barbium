"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function FormularioNovoServico() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [duracaoMinutos, setDuracaoMinutos] = useState("30");
  const [preco, setPreco] = useState("");
  const [comissaoPercentual, setComissaoPercentual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    const resposta = await fetch("/api/painel/servicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        duracaoMinutos: Number(duracaoMinutos),
        preco: Number(preco),
        comissaoPercentual: comissaoPercentual ? Number(comissaoPercentual) : undefined,
      }),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível criar o serviço.");
      setSalvando(false);
      return;
    }

    router.push("/painel/servicos");
    router.refresh();
  }

  return (
    <form onSubmit={aoEnviar} className="card" style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <div>
        <label htmlFor="nome">Nome do serviço</label>
        <input
          id="nome"
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Corte + barba"
          required
        />
      </div>

      <div>
        <label htmlFor="duracaoMinutos">Duração (minutos)</label>
        <input
          id="duracaoMinutos"
          type="number"
          min={5}
          max={480}
          step={5}
          className="input"
          value={duracaoMinutos}
          onChange={(e) => setDuracaoMinutos(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="preco">Preço (R$)</label>
        <input
          id="preco"
          type="number"
          min={0}
          step="0.01"
          className="input"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="Ex.: 45.00"
          required
        />
      </div>

      <div>
        <label htmlFor="comissaoPercentual">Comissão do barbeiro (%, opcional)</label>
        <input
          id="comissaoPercentual"
          type="number"
          min={0}
          max={100}
          step="0.1"
          className="input"
          value={comissaoPercentual}
          onChange={(e) => setComissaoPercentual(e.target.value)}
          placeholder="Ex.: 40"
        />
      </div>

      {erro && <p className="erro-form">{erro}</p>}

      <button type="submit" className="btn btn-primary" disabled={salvando}>
        {salvando ? "Salvando…" : "Criar serviço"}
      </button>
    </form>
  );
}
