"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";

export function BotaoExcluirCliente({
  clienteId,
  nome,
  totalConcluidos,
}: {
  clienteId: string;
  nome: string;
  totalConcluidos: number;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    try {
      const resposta = await fetch(`/api/painel/clientes/${clienteId}`, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível excluir.");
        setExcluindo(false);
        return;
      }
      router.push("/painel/clientes");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setExcluindo(false);
    }
  }

  return (
    <>
      <Botao variante="danger-outline" icone={<Trash2 size={16} aria-hidden="true" />} onClick={() => setAberto(true)}>
        Excluir cliente
      </Botao>
      <DialogoConfirmacao
        aberto={aberto}
        titulo={`Excluir ${nome}?`}
        descricao={
          totalConcluidos > 0
            ? `O nome e o telefone são apagados. ${totalConcluidos === 1 ? "O atendimento concluído continua" : `Os ${totalConcluidos} atendimentos concluídos continuam`} no caixa e nas comissões, como "Cliente removido". Agendamentos futuros sem pagamento são apagados. Essa ação não pode ser desfeita.`
            : "O cliente e os agendamentos dele são apagados. Essa ação não pode ser desfeita."
        }
        rotuloConfirmar="Excluir definitivamente"
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
