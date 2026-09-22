"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function FormularioNovoLancamento() {
  const router = useRouter();
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);

    const resposta = await fetch("/api/painel/caixa/lancamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, valor: Number(valor), descricao, data }),
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      setErro(dados.erro ?? "Não foi possível salvar.");
      setSalvando(false);
      return;
    }

    router.push("/painel/caixa");
    router.refresh();
  }

  return (
    <form onSubmit={aoEnviar} className="card" style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <div>
        <label htmlFor="tipo">Tipo</label>
        <select
          id="tipo"
          className="input"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "ENTRADA" | "SAIDA")}
        >
          <option value="SAIDA">Saída (despesa)</option>
          <option value="ENTRADA">Entrada avulsa</option>
        </select>
      </div>

      <div>
        <label htmlFor="descricao">Descrição</label>
        <input
          id="descricao"
          className="input"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Aluguel, produtos, venda de pomada"
          required
        />
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
          required
        />
      </div>

      <div>
        <label htmlFor="data">Data</label>
        <input
          id="data"
          type="date"
          className="input"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>

      {erro && <p className="erro-form">{erro}</p>}

      <button type="submit" className="btn btn-primary" disabled={salvando}>
        {salvando ? "Salvando…" : "Registrar lançamento"}
      </button>
    </form>
  );
}
