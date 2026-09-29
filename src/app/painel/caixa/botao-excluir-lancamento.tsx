"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";

export function BotaoExcluirLancamento({ id, descricao }: { id: string; descricao: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setExcluindo(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/painel/caixa/lancamentos/${id}`, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível excluir o lançamento.");
        return;
      }
      setAberto(false);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icone"
        onClick={() => setAberto(true)}
        aria-label={`Excluir lançamento “${descricao}”`}
        title="Excluir lançamento"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
      <DialogoConfirmacao
        aberto={aberto}
        titulo="Excluir lançamento?"
        descricao={`“${descricao}” será removido do caixa. Essa ação não pode ser desfeita.`}
        rotuloConfirmar="Excluir lançamento"
        textoCarregando="Excluindo…"
        perigo
        processando={excluindo}
        erro={erro}
        aoConfirmar={excluir}
        aoCancelar={() => {
          setAberto(false);
          setErro(null);
        }}
      />
    </>
  );
}
