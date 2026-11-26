"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";

// Mês de plano pago pela chave Pix: o dono confere no banco e responde.
export function AcoesPixDoPlano({ pagamentoId, cliente }: { pagamentoId: string; cliente: string }) {
  const router = useRouter();
  const [processando, setProcessando] = useState<"recebido" | "nao-recebido" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function responder(acao: "recebido" | "nao-recebido") {
    setProcessando(acao);
    setErro(null);
    try {
      const resposta = await fetch(`/api/painel/planos/pagamentos/${pagamentoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível salvar. Tente de novo.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setProcessando(null);
    }
  }

  return (
    <div className="pilha-sm">
      {erro && <Alerta tom="perigo">{erro}</Alerta>}
      <div className="form-acoes">
        <Botao
          pequeno
          variante="danger-outline"
          onClick={() => responder("nao-recebido")}
          carregando={processando === "nao-recebido"}
          textoCarregando="Salvando…"
          disabled={processando !== null}
          aria-label={`Não recebi o Pix de ${cliente}`}
        >
          Não recebi
        </Botao>
        <Botao
          pequeno
          variante="primary"
          icone={<Check size={16} aria-hidden="true" />}
          onClick={() => responder("recebido")}
          carregando={processando === "recebido"}
          textoCarregando="Confirmando…"
          disabled={processando !== null}
          aria-label={`Recebi o Pix de ${cliente}`}
        >
          Recebi
        </Botao>
      </div>
    </div>
  );
}
