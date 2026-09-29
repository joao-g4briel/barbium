"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function BotaoSair({ variante = "botao" }: { variante?: "botao" | "menu" | "icone" }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (variante === "icone") {
    return (
      <button
        type="button"
        onClick={sair}
        disabled={saindo}
        className="btn btn-ghost btn-icone btn-sm"
        aria-label="Sair da conta"
        title="Sair"
      >
        <LogOut size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      className={variante === "menu" ? "nav-item" : "btn btn-secondary"}
      style={variante === "menu" ? { width: "100%", border: "none", background: "none" } : undefined}
    >
      <LogOut size={20} strokeWidth={1.9} aria-hidden="true" />
      {saindo ? "Saindo…" : "Sair"}
    </button>
  );
}
