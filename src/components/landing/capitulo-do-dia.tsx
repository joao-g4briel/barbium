"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

// "Um dia na barbearia": quatro horas do dia. No computador, o exemplo de cada
// hora aparece num quadro parado ao lado, que troca de estado quando a hora
// chega ao meio da tela (240ms, opacidade e um leve desfoque). No celular,
// cada hora traz o próprio exemplo logo abaixo, sem nada fixo.
// `texto` e `exemplo` vêm do servidor; ficam num Fragment com chave porque,
// soltos entre irmãos, o React pede chave para eles.

export interface HoraDoDia {
  hora: string;
  titulo: string;
  selo?: string;
  texto: ReactNode;
  exemplo: ReactNode;
  legenda: string;
}

export function CapituloDoDia({ horas }: { horas: HoraDoDia[] }) {
  const lista = useRef<HTMLOListElement>(null);
  const [ativa, setAtiva] = useState(0);

  useEffect(() => {
    const itens = Array.from(lista.current?.querySelectorAll<HTMLElement>("[data-indice]") ?? []);
    if (!itens.length || !("IntersectionObserver" in window)) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setAtiva(Number((e.target as HTMLElement).dataset.indice));
        }
      },
      // Uma faixa fina no meio da tela: a hora que cruza essa faixa é a ativa.
      { rootMargin: "-45% 0px -45% 0px" },
    );
    itens.forEach((i) => observador.observe(i));
    return () => observador.disconnect();
  }, []);

  return (
    <div className="cd">
      <ol className="cd-horas" ref={lista}>
        {horas.map((h, i) => (
          <li key={h.hora} className="cd-hora" data-indice={i} data-ativa={i === ativa || undefined}>
            <time className="cd-relogio num">{h.hora}</time>
            <div className="cd-hora-texto">
              <h3 className="cd-hora-titulo">
                {h.titulo}
                {h.selo && (
                  <span className="badge cd-selo" data-tom="info">
                    {h.selo}
                  </span>
                )}
              </h3>
              <Fragment key="texto">{h.texto}</Fragment>
            </div>
            <figure className="cd-exemplo cd-exemplo-inline">
              <Fragment key="exemplo">{h.exemplo}</Fragment>
              <figcaption className="cd-legenda">{h.legenda} · exemplo</figcaption>
            </figure>
          </li>
        ))}
      </ol>

      <div className="cd-palco">
        <div className="cd-quadro">
          {horas.map((h, i) => (
            <figure key={h.hora} className="cd-exemplo cd-estado" data-ativo={i === ativa || undefined} aria-hidden={i !== ativa}>
              <Fragment key="exemplo">{h.exemplo}</Fragment>
              <figcaption className="cd-legenda">{h.legenda} · exemplo</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
