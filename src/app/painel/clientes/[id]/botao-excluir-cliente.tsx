"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotaoExcluirCliente({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    if (!confirm("Excluir esse cliente? Essa ação não pode ser desfeita.")) return;
    setErro(null);
    setExcluindo(true);

    const resposta = await fetch(`/api/painel/clientes/${clienteId}`, { method: "DELETE" });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      setErro(dados?.erro ?? "Não foi possível excluir.");
      setExcluindo(false);
      return;
    }

    router.push("/painel/clientes");
    router.refresh();
  }

  return (
    <div>
      <button
        className="btn btn-ghost btn-sm"
        style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
        onClick={excluir}
        disabled={excluindo}
      >
        {excluindo ? "Excluindo…" : "Excluir cliente"}
      </button>
      {erro && <p className="erro-form">{erro}</p>}
    </div>
  );
}
