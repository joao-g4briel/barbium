"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusAgendamento } from "@prisma/client";

export function AcoesAgendamento({
  id,
  status,
}: {
  id: string;
  status: StatusAgendamento;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function mudarStatus(novoStatus: StatusAgendamento) {
    setCarregando(true);
    const resposta = await fetch(`/api/painel/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    setCarregando(false);
    if (resposta.ok) router.refresh();
  }

  if (status === "CONFIRMADO") {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary btn-sm"
          disabled={carregando}
          onClick={() => mudarStatus("CONCLUIDO")}
        >
          Concluir
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={carregando}
          onClick={() => mudarStatus("FALTA")}
        >
          Falta
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={carregando}
          onClick={() => mudarStatus("CANCELADO")}
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-ghost btn-sm"
      disabled={carregando}
      onClick={() => mudarStatus("CONFIRMADO")}
    >
      Reabrir
    </button>
  );
}
