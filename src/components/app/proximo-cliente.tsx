"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StatusAgendamento } from "@prisma/client";
import { Scissors, UserCheck } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { StatusBadge } from "@/components/ui/badge";
import { useFuso } from "@/components/fuso-contexto";
import { capitalizar, formatarHora, formatarTempoAte } from "@/lib/formatar";

// Próximo cliente do barbeiro em destaque, com os botões do dia a dia:
// "Chegou" e "Começar atendimento". Concluir fica na agenda, onde se escolhe
// a forma de pagamento.
export function ProximoCliente({
  id,
  cliente,
  servico,
  inicio,
  status,
  plano,
}: {
  id: string;
  cliente: string;
  servico: string;
  inicio: string;
  status: StatusAgendamento;
  plano: string | null;
}) {
  const fuso = useFuso();
  const router = useRouter();
  const [enviando, setEnviando] = useState<StatusAgendamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const minutos = (Date.parse(inicio) - Date.now()) / 60000;

  async function mudar(novo: StatusAgendamento) {
    setEnviando(novo);
    setErro(null);
    try {
      const resposta = await fetch(`/api/painel/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novo }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível atualizar.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <section className="card proximo-cliente" aria-labelledby="titulo-proximo-cliente">
      <div className="proximo-cliente-topo">
        <div>
          <p id="titulo-proximo-cliente" className="proximo-cliente-rotulo">
            {status === "EM_ATENDIMENTO" ? "Em atendimento" : "Próximo cliente"}
          </p>
          <p className="proximo-cliente-nome">{cliente}</p>
          <p className="texto-secundario">
            {servico}
            {plano && ` · plano ${plano}`}
          </p>
        </div>
        <div className="proximo-cliente-hora">
          <time className="num" dateTime={inicio}>
            {formatarHora(new Date(inicio), fuso)}
          </time>
          <span className="texto-secundario texto-pequeno">{minutos > 0 ? capitalizar(formatarTempoAte(minutos)) : "Agora"}</span>
        </div>
      </div>
      <div className="proximo-cliente-acoes">
        <StatusBadge status={status} />
        {status === "CONFIRMADO" && (
          <Botao
            icone={<UserCheck size={18} aria-hidden="true" />}
            carregando={enviando === "CHEGOU"}
            textoCarregando="Salvando…"
            disabled={enviando !== null}
            onClick={() => mudar("CHEGOU")}
          >
            Chegou
          </Botao>
        )}
        {(status === "CONFIRMADO" || status === "CHEGOU") && (
          <Botao
            variante="primary"
            icone={<Scissors size={18} aria-hidden="true" />}
            carregando={enviando === "EM_ATENDIMENTO"}
            textoCarregando="Salvando…"
            disabled={enviando !== null}
            onClick={() => mudar("EM_ATENDIMENTO")}
          >
            Começar atendimento
          </Botao>
        )}
        {status === "EM_ATENDIMENTO" && (
          <Link href="/painel/agenda" className="btn btn-primary">
            Concluir na agenda
          </Link>
        )}
      </div>
      {erro && <Alerta tom="perigo">{erro}</Alerta>}
    </section>
  );
}
