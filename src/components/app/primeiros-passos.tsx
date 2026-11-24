"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CopiarTexto } from "@/components/ui/copiar-texto";
import { COOKIE_PASSOS_OCULTOS, type Passo } from "@/lib/primeiros-passos";

// Checklist da barbearia nova, no topo da visão geral do dono. "Ocultar"
// grava um cookie neste aparelho (lido no servidor, então não pisca).
export function PrimeirosPassos({
  passos,
  linkAgendamento,
  barbeariaId,
  boasVindas,
}: {
  passos: Passo[];
  linkAgendamento: string;
  barbeariaId: string;
  boasVindas: boolean;
}) {
  const [oculto, setOculto] = useState(false);
  if (oculto) return null;

  const feitos = passos.filter((p) => p.feito).length;
  const proximo = passos.find((p) => !p.feito)?.id;

  function ocultar() {
    document.cookie = `${COOKIE_PASSOS_OCULTOS}=${barbeariaId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOculto(true);
  }

  return (
    <section className="card passos-iniciais" aria-labelledby="titulo-passos">
      <div className="passos-iniciais-topo">
        <div>
          <h2 id="titulo-passos" className="card-titulo">
            {boasVindas ? "Sua barbearia está criada. Faltam poucos passos." : "Primeiros passos"}
          </h2>
          <p className="card-descricao num">
            {feitos} de {passos.length} feitos
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={ocultar}>
          Ocultar
        </button>
      </div>
      <div
        className="barra-progresso"
        role="progressbar"
        aria-label="Progresso dos primeiros passos"
        aria-valuemin={0}
        aria-valuemax={passos.length}
        aria-valuenow={feitos}
      >
        <div className="barra-progresso-preenchimento" style={{ width: `${(feitos / passos.length) * 100}%` }} />
      </div>
      <ol className="passos-iniciais-lista">
        {passos.map((passo) => (
          <li key={passo.id} className="passo-inicial" data-feito={passo.feito || undefined} data-proximo={passo.id === proximo || undefined}>
            <span className="passo-inicial-marca" aria-hidden="true">
              {passo.feito && <Check size={14} strokeWidth={3} />}
            </span>
            <div className="passo-inicial-texto">
              <p className="passo-inicial-titulo">
                {passo.titulo}
                <span className="sr-only">{passo.feito ? " (feito)" : " (pendente)"}</span>
              </p>
              {!passo.feito && <p className="passo-inicial-descricao">{passo.descricao}</p>}
              {!passo.feito && passo.id === "link" && (
                <div className="passo-inicial-link">
                  <span className="num">{linkAgendamento}</span>
                  <CopiarTexto texto={linkAgendamento} rotulo="Copiar link" />
                </div>
              )}
            </div>
            {!passo.feito && passo.href && (
              <Link
                href={passo.href}
                className="btn btn-sm btn-secondary passo-inicial-acao"
              >
                {passo.acao}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
