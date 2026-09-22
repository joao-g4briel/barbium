"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  servicoId: string;
  nomeInicial: string;
  duracaoInicial: number;
  precoInicial: number;
  comissaoInicial: number | null;
  ativoInicial: boolean;
}

export function FormularioEditarServico({
  servicoId,
  nomeInicial,
  duracaoInicial,
  precoInicial,
  comissaoInicial,
  ativoInicial,
}: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [duracaoMinutos, setDuracaoMinutos] = useState(String(duracaoInicial));
  const [preco, setPreco] = useState(String(precoInicial));
  const [comissaoPercentual, setComissaoPercentual] = useState(
    comissaoInicial != null ? String(comissaoInicial) : "",
  );
  const [ativo, setAtivo] = useState(ativoInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setSalvando(true);

    const resposta = await fetch(`/api/painel/servicos/${servicoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        duracaoMinutos: Number(duracaoMinutos),
        preco: Number(preco),
        comissaoPercentual: comissaoPercentual ? Number(comissaoPercentual) : null,
        ativo,
      }),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível salvar.");
      setSalvando(false);
      return;
    }

    router.push("/painel/servicos");
    router.refresh();
  }

  return (
    <div className="card" style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <div>
        <label htmlFor="nome">Nome do serviço</label>
        <input id="nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
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
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <span>Serviço ativo</span>
      </label>
      <p style={{ color: "var(--muted)", fontSize: "0.8125rem", margin: 0 }}>
        Desmarcando, ele some da página pública de agendamento, mas continua no histórico.
      </p>

      {erro && <p className="erro-form">{erro}</p>}

      <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar alterações"}
      </button>
    </div>
  );
}
