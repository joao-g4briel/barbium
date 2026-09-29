"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// Trava a rolagem do fundo enquanto houver diálogo aberto, compensando a
// largura da barra de rolagem pra página não pular. Contador porque mais de
// um diálogo pode estar aberto ao mesmo tempo.
let dialogosAbertos = 0;

function travarRolagem() {
  dialogosAbertos += 1;
  if (dialogosAbertos > 1) return;
  const raiz = document.documentElement;
  const larguraBarra = window.innerWidth - raiz.clientWidth;
  raiz.style.overflow = "hidden";
  if (larguraBarra > 0) raiz.style.paddingRight = `${larguraBarra}px`;
}

function destravarRolagem() {
  dialogosAbertos = Math.max(0, dialogosAbertos - 1);
  if (dialogosAbertos > 0) return;
  const raiz = document.documentElement;
  raiz.style.overflow = "";
  raiz.style.paddingRight = "";
}

interface DialogoProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: ReactNode;
  descricao?: ReactNode;
  children?: ReactNode;
  rodape?: ReactNode;
  // Painel lateral no desktop; no celular todo diálogo vira folha inferior.
  lateral?: boolean;
  // Durante uma operação em andamento, Esc e clique fora não fecham.
  bloquearFechamento?: boolean;
}

export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  lateral,
  bloquearFechamento,
}: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);
  const tituloId = useId();
  const descricaoId = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) {
      focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialogo.showModal();
    } else if (!aberto && dialogo.open) {
      dialogo.close();
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    travarRolagem();
    return destravarRolagem;
  }, [aberto]);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;

    function aoCancelar(evento: Event) {
      if (bloquearFechamento) evento.preventDefault();
    }
    function aoFecharNativo() {
      const alvo = focoAnterior.current;
      if (alvo && alvo.isConnected) alvo.focus();
      aoFechar();
    }

    dialogo.addEventListener("cancel", aoCancelar);
    dialogo.addEventListener("close", aoFecharNativo);
    return () => {
      dialogo.removeEventListener("cancel", aoCancelar);
      dialogo.removeEventListener("close", aoFecharNativo);
    };
  }, [aoFechar, bloquearFechamento]);

  return (
    <dialog
      ref={ref}
      className={`dialogo${lateral ? " dialogo-lateral" : ""}`}
      aria-labelledby={tituloId}
      aria-describedby={descricao ? descricaoId : undefined}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget && !bloquearFechamento) ref.current?.close();
      }}
    >
      {aberto && (
        <>
          <div className="dialogo-cabecalho">
            <div>
              <h2 id={tituloId} className="dialogo-titulo">
                {titulo}
              </h2>
              {descricao && (
                <div id={descricaoId} className="dialogo-descricao">
                  {descricao}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icone btn-sm dialogo-fechar"
              onClick={() => ref.current?.close()}
              disabled={bloquearFechamento}
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {children && <div className="dialogo-corpo">{children}</div>}
          {rodape && <div className="dialogo-rodape">{rodape}</div>}
        </>
      )}
    </dialog>
  );
}
