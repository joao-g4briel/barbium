"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import type { Plano } from "@prisma/client";
import { ROTULO_PLANO, PLANOS, descreverLimite } from "@/lib/planos";
import {
  DIAS_TESTE,
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

// Plano destacado na landing (quem tem equipe). No painel, o destaque é o
// plano atual da barbearia.
const PLANO_RECOMENDADO: Plano = "BARBEARIA";

// Os três planos com a escolha de período, e o adicional de WhatsApp no seu
// próprio cartão. Na landing o botão leva ao cadastro (teste grátis); no
// painel, ao pagamento. Preços e descontos vêm só de lib/precos.
export function TabelaPrecos({
  acao,
  planoAtual,
  barbeariaId,
  periodoInicial = "MENSAL",
}: {
  acao: "cadastro" | "assinar";
  planoAtual?: Plano;
  barbeariaId?: string;
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
          const recomendado = acao === "cadastro" && plano === PLANO_RECOMENDADO;
          const destaque = recomendado || atual;
          const tituloId = `${id}-${plano}`;
          return (
            <li key={plano} className="precos-plano" data-destaque={destaque || undefined} aria-labelledby={tituloId}>
              <div className="precos-plano-topo">
                <h3 id={tituloId} className="precos-plano-nome">
                  {ROTULO_PLANO[plano]}
                </h3>
                {atual && (
                  <span className="badge" data-tom="sucesso">
                    Seu plano
                  </span>
                )}
                {recomendado && (
                  <span className="badge" data-tom="sucesso">
                    Recomendado para equipes
                  </span>
                )}
              </div>
              <p className="precos-plano-limite">{descreverLimite(plano).replace(/^./, (c) => c.toUpperCase())}</p>
              <p className="precos-valor num" key={`${plano}-${periodo}`}>
                <span className="precos-valor-numero">{formatarMoeda(precoPorMes(plano, periodo))}</span>
                <span className="precos-valor-unidade">/mês</span>
              </p>
              <p className="precos-cobranca num" key={`${plano}-${periodo}-cobranca`}>
                {meses === 1
                  ? "Cobrado todo mês"
                  : `${formatarMoeda(total)} ${meses === 12 ? "por ano" : `a cada ${meses} meses`} · ${vantagemDoPeriodo(plano, periodo)}`}
              </p>
              {acao === "cadastro" ? (
                <Link
                  href={`/cadastro?plano=${plano}&periodo=${periodo}`}
                  className={`btn btn-bloco ${destaque ? "btn-primary" : "btn-secondary"}`}
                >
                  Começar {DIAS_TESTE} dias grátis
                </Link>
              ) : (
                <a
                  href={linkAssinar(plano, periodo, ROTULO_PLANO[plano], barbeariaId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn btn-bloco ${destaque ? "btn-primary" : "btn-secondary"}`}
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
        <span className="precos-adicional-icone" aria-hidden="true">
          <MessageCircle size={20} />
        </span>
        <div className="precos-adicional-texto">
          <h3 className="precos-adicional-titulo">Adicional de WhatsApp</h3>
          <p>
            Confirmação e lembrete para o cliente, link para ele remarcar ou cancelar e aviso de cada agendamento para você.
            {acao === "cadastro" ? " No teste grátis, já vem ligado." : ""}
          </p>
        </div>
        <div className="precos-adicional-preco">
          <p className="num">
            <span className="precos-adicional-valor">{formatarMoeda(PRECO_ADICIONAL_WHATSAPP)}</span>
            <span className="precos-valor-unidade">/mês</span>
          </p>
          <p className="precos-adicional-nota">Cobrança adicional, escolhida no pagamento</p>
        </div>
      </div>
    </div>
  );
}
