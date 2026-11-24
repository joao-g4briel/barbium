"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A espinha da landing: o trilho da agenda atravessando o dia. Conforme a
// página desce, a linha "agora" acompanha a rolagem e cada hora alcançada
// acende no verde de destaque. Sem JavaScript ou com movimento reduzido, tudo já aparece
// aceso; nada fica escondido esperando animação.
export function TrilhoDoDia({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const lista = ref.current;
    if (!lista) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    lista.dataset.animado = "true";
    const horas = Array.from(lista.querySelectorAll<HTMLElement>("[data-hora]"));

    let pedido = 0;
    const atualizar = () => {
      pedido = 0;
      const caixa = lista.getBoundingClientRect();
      // A "hora atual" é o ponto a 55% da altura da tela.
      const alvo = window.innerHeight * 0.55;
      const progresso = Math.min(1, Math.max(0, (alvo - caixa.top) / caixa.height));
      lista.style.setProperty("--progresso-dia", String(progresso));
      for (const hora of horas) {
        hora.dataset.alcancada = hora.getBoundingClientRect().top < alvo ? "true" : "false";
      }
    };
    const agendar = () => {
      if (!pedido) pedido = requestAnimationFrame(atualizar);
    };

    atualizar();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
      if (pedido) cancelAnimationFrame(pedido);
      delete lista.dataset.animado;
    };
  }, []);

  return (
    <ol ref={ref} className="dia-trilho" aria-label="Um dia de trabalho na barbearia">
      {children}
    </ol>
  );
}
