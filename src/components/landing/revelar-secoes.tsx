"use client";

import { useEffect } from "react";

// Revelação leve dos blocos marcados com data-revelar quando entram na tela,
// uma vez só. Só esconde o que ainda está abaixo da tela no carregamento;
// sem JavaScript ou com movimento reduzido, tudo aparece de imediato.
export function RevelarSecoes() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const abaixo = Array.from(document.querySelectorAll<HTMLElement>("[data-revelar]")).filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight * 0.92,
    );
    if (!abaixo.length) return;
    for (const el of abaixo) el.dataset.revelar = "esperando";
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          (entrada.target as HTMLElement).dataset.revelar = "visivel";
          observador.unobserve(entrada.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    for (const el of abaixo) observador.observe(el);
    return () => {
      observador.disconnect();
      for (const el of abaixo) el.dataset.revelar = "visivel";
    };
  }, []);
  return null;
}
