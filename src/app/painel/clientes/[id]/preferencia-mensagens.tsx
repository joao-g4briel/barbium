"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alerta } from "@/components/ui/alerta";

// Salva na hora em que a chave muda; se falhar, a chave volta ao que era.
export function PreferenciaMensagens({ clienteId, aceitaInicial }: { clienteId: string; aceitaInicial: boolean }) {
  const router = useRouter();
  const [aceita, setAceita] = useState(aceitaInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(valor: boolean) {
    setErro(null);
    setAceita(valor);
    setSalvando(true);
    try {
      const resposta = await fetch(`/api/painel/clientes/${clienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aceitaMensagens: valor }),
      });
      if (!resposta.ok) throw new Error();
      router.refresh();
    } catch {
      setAceita(!valor);
      setErro("Não foi possível salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="pilha-sm">
      {erro && <Alerta tom="perigo">{erro}</Alerta>}
      <label className="interruptor">
        <input type="checkbox" checked={aceita} disabled={salvando} onChange={(e) => alternar(e.target.checked)} />
        <span className="interruptor-trilho" aria-hidden="true" />
        Enviar mensagens automáticas no WhatsApp
      </label>
      <p className="texto-secundario texto-pequeno">
        {aceita
          ? "O cliente recebe a confirmação de cada agendamento."
          : "O cliente pediu para não receber. Nenhuma mensagem automática é enviada a ele."}
      </p>
    </div>
  );
}
