"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CreditCard, Scissors } from "lucide-react";
import { SimboloBarbium } from "@/components/ui/marca";

// A carteirinha do assinante de um plano de corte (exemplo): o plano, o valor
// do mês e um selo por atendimento do mês, os usados carimbados. Os selos
// carimbam uma vez quando a carteirinha entra na tela; com movimento
// reduzido, já aparecem carimbados.

const USOS = 4;
const USADOS = 2;

export function Carteirinha() {
  const ref = useRef<HTMLDivElement>(null);
  const [carimbado, setCarimbado] = useState(false);

  useEffect(() => {
    const alvo = ref.current;
    if (!alvo || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setCarimbado(true);
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          observador.disconnect();
          setCarimbado(true);
        }
      },
      { threshold: 0.6 },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  return (
    <figure className="ct">
      <div className="ct-cartao" ref={ref} data-carimbado={carimbado || undefined} aria-hidden="true">
        <div className="ct-topo">
          <span className="ct-barbearia">Barbearia Exemplo</span>
          <SimboloBarbium tamanho={18} />
        </div>
        <p className="ct-plano">Plano Corte</p>
        <p className="ct-valor num">
          R$ 99,00<span>/mês</span>
        </p>
        <p className="ct-uso">4 atendimentos por mês · 2 usados</p>
        <ol className="ct-selos">
          {Array.from({ length: USOS }, (_, i) => (
            <li key={i} className="ct-selo" data-usado={i < USADOS || undefined} style={{ "--ordem": i } as CSSProperties}>
              {i < USADOS && <Scissors size={18} strokeWidth={2.2} />}
            </li>
          ))}
        </ol>
        <div className="ct-rodape">
          <span className="num">Vale até 24/12</span>
          <span className="ct-forma">
            <CreditCard size={14} />
            Cartão · renova sozinho
          </span>
        </div>
      </div>
      <figcaption className="cd-legenda">Carteirinha do assinante · exemplo</figcaption>
    </figure>
  );
}
