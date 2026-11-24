"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { Badge } from "@/components/ui/badge";
import { estadoWhatsapp } from "@/lib/whatsapp-adicional";
import { formatarMoeda } from "@/lib/formatar";
import { PRECO_ADICIONAL_WHATSAPP } from "@/lib/precos";

// Chave do adicional de WhatsApp. Liga quando o pagamento do adicional cai na
// Cakto; desliga se ele for cancelado. No teste grátis as mensagens saem
// mesmo desligada.
export function AdicionalWhatsapp({
  barbeariaId,
  whatsappAtivo,
  emTeste,
  acessoAte,
}: {
  barbeariaId: string;
  whatsappAtivo: boolean;
  emTeste: boolean;
  acessoAte: string | null;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const estado = estadoWhatsapp({ whatsappAtivo, emTeste, acessoAte: acessoAte ? new Date(acessoAte) : null });

  async function alternar() {
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/super-admin/barbearias/${barbeariaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappAtivo: !whatsappAtivo }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível salvar.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const descricao = whatsappAtivo
    ? estado === "desligado"
      ? "Adicional ligado, mas o acesso está vencido: nenhuma mensagem sai até renovar."
      : "Adicional ligado: confirmação, lembrete e avisos saem normalmente."
    : estado === "teste"
      ? "Adicional desligado. As mensagens saem durante o teste grátis e param quando ele acabar, a menos que o adicional seja ligado."
      : "Adicional desligado: nenhuma mensagem automática sai para esta barbearia.";

  return (
    <section className="card" aria-labelledby="titulo-whatsapp">
      <div className="pilha-sm">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 id="titulo-whatsapp" className="card-titulo">
            Adicional de WhatsApp
          </h2>
          {estado === "adicional" && <Badge tom="sucesso">Ligado</Badge>}
          {estado === "teste" && <Badge tom="info">No teste grátis</Badge>}
          {estado === "desligado" && <Badge tom="neutro">Mensagens desligadas</Badge>}
        </div>
        <p className="card-descricao">
          {descricao} Ligue depois de confirmar o pagamento do adicional ({formatarMoeda(PRECO_ADICIONAL_WHATSAPP)}/mês) na
          Cakto.
        </p>
        {erro && <Alerta tom="perigo">{erro}</Alerta>}
        <div className="form-acoes">
          <Botao pequeno variante={whatsappAtivo ? "ghost" : undefined} onClick={alternar} carregando={salvando}>
            {whatsappAtivo ? "Desligar adicional" : "Ligar adicional"}
          </Botao>
        </div>
      </div>
    </section>
  );
}
