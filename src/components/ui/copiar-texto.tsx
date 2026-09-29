"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopiarTexto({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [estado, setEstado] = useState<"ocioso" | "copiado" | "erro">("ocioso");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
      setTimeout(() => setEstado("ocioso"), 2000);
    } catch {
      setEstado("erro");
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={copiar}>
        {estado === "copiado" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {estado === "copiado" ? "Copiado" : rotulo}
      </button>
      <span className="sr-only" role="status">
        {estado === "copiado" ? "Link copiado." : estado === "erro" ? "Não foi possível copiar. Selecione e copie o link." : ""}
      </span>
    </>
  );
}
