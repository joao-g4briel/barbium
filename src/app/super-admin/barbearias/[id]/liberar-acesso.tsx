"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { Badge } from "@/components/ui/badge";
import { formatarDataInstante } from "@/lib/formatar";

type Liberacao = { meses: 1 | 6 | 12 } | { semPrazo: true };

// Prazo de uso da barbearia. Depois que o pagamento cai na Cakto, o super
// admin estende o acesso daqui (a liberação automática pela Cakto vem depois).
export function LiberarAcesso({
  barbeariaId,
  acessoAte,
  emTeste,
}: {
  barbeariaId: string;
  acessoAte: string | null;
  emTeste: boolean;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const fim = acessoAte ? new Date(acessoAte) : null;
  const vencido = fim !== null && fim.getTime() <= Date.now();

  async function liberar(chave: string, liberacao: Liberacao) {
    setSalvando(chave);
    setErro(null);
    setAviso(null);
    try {
      const resposta = await fetch(`/api/super-admin/barbearias/${barbeariaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acesso: liberacao }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível liberar o acesso.");
        return;
      }
      const novo = dados?.barbearia?.acessoAte as string | null;
      setAviso(novo ? `Acesso liberado até ${formatarDataInstante(new Date(novo), { day: "2-digit", month: "2-digit", year: "numeric" })}.` : "Acesso liberado sem prazo.");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <section className="card" aria-labelledby="titulo-acesso">
      <div className="pilha-sm">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 id="titulo-acesso" className="card-titulo">
            Acesso
          </h2>
          {fim === null ? (
            <Badge tom="sucesso">Sem prazo</Badge>
          ) : vencido ? (
            <Badge tom="atencao">{emTeste ? "Teste vencido" : "Vencido"}</Badge>
          ) : (
            <Badge tom={emTeste ? "info" : "sucesso"}>{emTeste ? "Em teste" : "Assinatura paga"}</Badge>
          )}
        </div>
        <p className="card-descricao">
          {fim
            ? `${vencido ? "Venceu em" : "Vale até"} ${formatarDataInstante(fim, { day: "2-digit", month: "2-digit", year: "numeric" })}. Depois de confirmar o pagamento na Cakto, estenda o acesso pelo período pago.`
            : "Esta barbearia não tem prazo: foi cadastrada ou liberada pela plataforma."}
        </p>
        {erro && <Alerta tom="perigo">{erro}</Alerta>}
        {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}
        <div className="form-acoes">
          {(
            [
              ["1", "+ 1 mês", { meses: 1 }],
              ["6", "+ 6 meses", { meses: 6 }],
              ["12", "+ 1 ano", { meses: 12 }],
            ] as const
          ).map(([chave, rotulo, liberacao]) => (
            <Botao
              key={chave}
              pequeno
              onClick={() => liberar(chave, liberacao)}
              carregando={salvando === chave}
              disabled={salvando !== null}
            >
              {rotulo}
            </Botao>
          ))}
          {fim !== null && (
            <Botao
              pequeno
              variante="ghost"
              onClick={() => liberar("sem", { semPrazo: true })}
              carregando={salvando === "sem"}
              disabled={salvando !== null}
            >
              Tirar o prazo
            </Botao>
          )}
        </div>
        <p className="texto-secundario texto-pequeno">
          O período conta a partir do fim do prazo atual (ou de hoje, se já venceu).
        </p>
      </div>
    </section>
  );
}
