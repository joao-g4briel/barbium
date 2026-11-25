"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

// Botão fixo de WhatsApp na landing. Some enquanto a abertura, o fim ou o
// rodapé estão na tela, porque eles já têm o próprio botão de WhatsApp.
const COM_WHATSAPP = [".landing-abertura", ".landing-fim", ".landing-rodape"];

export function WhatsappFlutuante({ href }: { href: string }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const alvos = COM_WHATSAPP.map((s) => document.querySelector(s)).filter((el): el is Element => el !== null);
    const naTela = new Set<Element>();
    const observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) naTela.add(e.target);
        else naTela.delete(e.target);
      }
      setVisivel(naTela.size === 0);
    });
    for (const el of alvos) observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary landing-whatsapp"
      data-visivel={visivel || undefined}
      aria-hidden={!visivel || undefined}
      tabIndex={visivel ? undefined : -1}
    >
      <MessageCircle size={20} aria-hidden="true" />
      WhatsApp
    </a>
  );
}
