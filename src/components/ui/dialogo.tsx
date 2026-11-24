"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
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

// Duração da saída (--motion-fast). A entrada (180ms) fica no CSS.
const SAIDA_MS = 120;

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
  const [saindo, setSaindo] = useState(false);
  const temporizador = useRef<number | null>(null);

  // Durante a saída o painel continua mostrando o último conteúdo aberto,
  // mesmo que quem abriu já tenha limpado os dados (senão ele sairia vazio).
  const ultimo = useRef({ titulo, descricao, children, rodape });
  if (aberto) ultimo.current = { titulo, descricao, children, rodape };
  const conteudo = aberto ? { titulo, descricao, children, rodape } : ultimo.current;

  // Todo fechamento passa por aqui: anima a saída e só então fecha o <dialog>.
  const fechar = useCallback(() => {
    const dialogo = ref.current;
    if (!dialogo || !dialogo.open || temporizador.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialogo.close();
      return;
    }
    setSaindo(true);
    temporizador.current = window.setTimeout(() => {
      temporizador.current = null;
      setSaindo(false);
      ref.current?.close();
    }, SAIDA_MS);
  }, []);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto) {
      if (temporizador.current !== null) {
        window.clearTimeout(temporizador.current);
        temporizador.current = null;
        setSaindo(false);
      }
      if (!dialogo.open) {
        focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialogo.showModal();
      }
    } else if (dialogo.open) {
      fechar();
    }
  }, [aberto, fechar]);

  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  useEffect(() => {
    if (!aberto) return;
    travarRolagem();
    return destravarRolagem;
  }, [aberto]);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;

    // Esc: sai com a mesma animação dos outros jeitos de fechar.
    function aoCancelar(evento: Event) {
      evento.preventDefault();
      if (!bloquearFechamento) fechar();
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
  }, [aoFechar, bloquearFechamento, fechar]);

  return (
    <dialog
      ref={ref}
      className={`dialogo${lateral ? " dialogo-lateral" : ""}`}
      data-saindo={saindo || undefined}
      aria-labelledby={tituloId}
      aria-describedby={conteudo.descricao ? descricaoId : undefined}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget && !bloquearFechamento) fechar();
      }}
    >
      {(aberto || saindo) && (
        <>
          <div className="dialogo-cabecalho">
            <div>
              <h2 id={tituloId} className="dialogo-titulo">
                {conteudo.titulo}
              </h2>
              {conteudo.descricao && (
                <div id={descricaoId} className="dialogo-descricao">
                  {conteudo.descricao}
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icone btn-sm dialogo-fechar"
              onClick={fechar}
              disabled={bloquearFechamento}
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {conteudo.children && <div className="dialogo-corpo">{conteudo.children}</div>}
          {conteudo.rodape && <div className="dialogo-rodape">{conteudo.rodape}</div>}
        </>
      )}
    </dialog>
  );
}
