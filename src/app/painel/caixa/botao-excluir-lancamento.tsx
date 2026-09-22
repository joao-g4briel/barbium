"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotaoExcluirLancamento({ id }: { id: string }) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    if (!confirm("Excluir esse lançamento?")) return;
    setExcluindo(true);
    const resposta = await fetch(`/api/painel/caixa/lancamentos/${id}`, { method: "DELETE" });
    setExcluindo(false);
    if (resposta.ok) router.refresh();
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={excluir} disabled={excluindo}>
      Excluir
    </button>
  );
}
