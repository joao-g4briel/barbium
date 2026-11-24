"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PREVIAS } from "@/lib/previas";

// As cinco prévias ilustrativas (docs/images) num trilho com encaixe nativo:
// arrastar no celular, botões e setas do teclado no computador. A navegação é
// só manual. Título e descrição também vão em HTML, porque o texto da arte
// fica pequeno no celular.
export function CarrosselPrevias() {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const total = PREVIAS.length;

  const irPara = useCallback((indice: number) => {
    const el = trilho.current;
    if (!el) return;
    const alvo = Math.max(0, Math.min(total - 1, indice));
    const slide = el.children[alvo] as HTMLElement | undefined;
    if (!slide) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const recuo = parseFloat(getComputedStyle(el).paddingLeft || "0");
    const delta = slide.getBoundingClientRect().left - el.getBoundingClientRect().left - recuo;
    el.scrollTo({ left: el.scrollLeft + delta, behavior: reduzido ? "auto" : "smooth" });
  }, [total]);

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    let pedido = 0;
    const medir = () => {
      pedido = 0;
      const slides = Array.from(el.children) as HTMLElement[];
      const inicio = el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft || "0");
      let melhor = 0;
      let distancia = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(s.getBoundingClientRect().left - inicio);
        if (d < distancia) {
          distancia = d;
          melhor = i;
        }
      });
      setAtual(melhor);
    };
    const agendar = () => {
      if (!pedido) pedido = requestAnimationFrame(medir);
    };
    el.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      el.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, []);

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "ArrowRight") {
      evento.preventDefault();
      irPara(atual + 1);
    } else if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      irPara(atual - 1);
    } else if (evento.key === "Home") {
      evento.preventDefault();
      irPara(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      irPara(total - 1);
    }
  }

  return (
    <div className="carrossel" role="region" aria-roledescription="carrossel" aria-label="Prévias ilustrativas do Barbium" onKeyDown={aoTeclar}>
      <div ref={trilho} className="carrossel-trilho" tabIndex={0} aria-label="Prévias. Use as setas do teclado para trocar.">
        {PREVIAS.map((previa, i) => (
          <figure
            key={previa.src}
            className="carrossel-slide"
            data-ativo={i === atual || undefined}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${total}: ${previa.titulo}`}
          >
            <div className="carrossel-imagem">
              <Image
                src={previa.src}
                alt={previa.alt}
                width={previa.largura}
                height={previa.altura}
                sizes="(min-width: 1200px) 900px, (min-width: 768px) 80vw, 88vw"
              />
            </div>
            <figcaption className="carrossel-legenda">
              <span className="carrossel-legenda-titulo">{previa.titulo}</span>
              <span className="carrossel-legenda-descricao">{previa.descricao}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="carrossel-controles">
        <button type="button" className="btn btn-secondary btn-icone" onClick={() => irPara(atual - 1)} disabled={atual === 0} aria-label="Prévia anterior">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className="carrossel-pontos" role="group" aria-label="Escolher prévia">
          {PREVIAS.map((previa, i) => (
            <button
              key={previa.src}
              type="button"
              className="carrossel-ponto"
              aria-label={`Prévia ${i + 1} de ${total}: ${previa.titulo}`}
              aria-current={i === atual ? "true" : undefined}
              onClick={() => irPara(i)}
            />
          ))}
        </div>
        <span className="carrossel-contador num" aria-hidden="true">
          {atual + 1} de {total}
        </span>
        <button type="button" className="btn btn-secondary btn-icone" onClick={() => irPara(atual + 1)} disabled={atual === total - 1} aria-label="Próxima prévia">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        Prévia {atual + 1} de {total}: {PREVIAS[atual].titulo}
      </p>
    </div>
  );
}
