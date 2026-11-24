"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import type { Plano } from "@prisma/client";
import { ROTULO_PLANO, PLANOS, descreverLimite } from "@/lib/planos";
import {
  MESES_DO_PERIODO,
  PERIODOS,
  PRECOS,
  PRECO_ADICIONAL_WHATSAPP,
  ROTULO_PERIODO_ASSINATURA,
  linkAssinar,
  precoPorMes,
  vantagemDoPeriodo,
  type Periodo,
} from "@/lib/precos";
import { formatarMoeda } from "@/lib/formatar";

// Os três planos com a escolha de período. Na landing o botão leva ao
// cadastro (teste grátis); no painel, ao pagamento.
export function TabelaPrecos({
  acao,
  planoAtual,
  periodoInicial = "MENSAL",
}: {
  acao: "cadastro" | "assinar";
  planoAtual?: Plano;
  periodoInicial?: Periodo;
}) {
  const [periodo, setPeriodo] = useState<Periodo>(periodoInicial);
  const id = useId();

  return (
    <div className="precos">
      <div className="segmentado precos-periodo" role="radiogroup" aria-label="Período da assinatura">
        {PERIODOS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={periodo === p}
            className="segmentado-item"
            onClick={() => setPeriodo(p)}
          >
            {ROTULO_PERIODO_ASSINATURA[p]}
          </button>
        ))}
      </div>

      <ul className="precos-planos" aria-live="polite">
        {PLANOS.map((plano) => {
          const total = PRECOS[plano][periodo];
          const meses = MESES_DO_PERIODO[periodo];
          const atual = plano === planoAtual;
          const tituloId = `${id}-${plano}`;
          return (
            <li key={plano} className="precos-plano" data-atual={atual || undefined} aria-labelledby={tituloId}>
              <div className="precos-plano-topo">
                <h3 id={tituloId} className="precos-plano-nome">
                  {ROTULO_PLANO[plano]}
                </h3>
                {atual && <span className="badge" data-tom="sucesso">Seu plano</span>}
              </div>
              <p className="precos-plano-limite">{descreverLimite(plano).replace(/^./, (c) => c.toUpperCase())}</p>
              <p className="precos-valor num">
                <span className="precos-valor-numero">{formatarMoeda(precoPorMes(plano, periodo))}</span>
                <span className="precos-valor-unidade">/mês</span>
              </p>
              <p className="precos-cobranca num">
                {meses === 1
                  ? "Cobrado todo mês"
                  : `${formatarMoeda(total)} ${meses === 12 ? "por ano" : `a cada ${meses} meses`} · ${vantagemDoPeriodo(plano, periodo)}`}
              </p>
              {acao === "cadastro" ? (
                <Link href={`/cadastro?plano=${plano}&periodo=${periodo}`} className="btn btn-secondary btn-bloco">
                  Começar 7 dias grátis
                </Link>
              ) : (
                <a
                  href={linkAssinar(plano, periodo, ROTULO_PLANO[plano])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn btn-bloco ${atual ? "btn-primary" : "btn-secondary"}`}
                >
                  Assinar {ROTULO_PLANO[plano]}
                </a>
              )}
              <ul className="precos-itens">
                {[
                  "Agenda com chegou e em atendimento",
                  "Link de agendamento com sinal no Pix",
                  "Caixa, comissões e indicadores",
                ].map((item) => (
                  <li key={item}>
                    <Check size={16} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <div className="precos-adicional">
        <MessageCircle size={20} aria-hidden="true" />
        <p>
          <b>Adicional de WhatsApp · {formatarMoeda(PRECO_ADICIONAL_WHATSAPP)}/mês.</b> Confirmação e lembrete para o
          cliente, link para ele remarcar ou cancelar, e aviso de cada agendamento para você. Você inclui no pagamento
          da assinatura{acao === "cadastro" ? "; no teste grátis, já vem ligado" : ""}.
        </p>
      </div>
    </div>
  );
}
