"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { StatusAgendamento } from "@prisma/client";
import { CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";

// Demonstração da abertura: o cliente escolhe 14:00 no link de agendamento e
// o horário entra na agenda de hoje, confirmado. Dados fictícios: não envia
// mensagem nem cria agendamento. Toca enquanto está na tela e com a aba
// visível, e pode ser pausada ou repetida. Sem JavaScript ou com movimento
// reduzido, fica parada mostrando a história inteira (horário escolhido e
// agendamento já na agenda).

const HORARIOS = ["13:00", "13:40", "14:00", "14:40", "15:20", "16:00"];

// passo 0: escolhendo · 1: 14:00 marcado · 2: confirmando ·
// 3: confirmado e entrando na agenda (destacado) · 4: assentado. Total 8s.
const SEQUENCIA = [
  { passo: 0, ms: 1100 },
  { passo: 1, ms: 1100 },
  { passo: 2, ms: 700 },
  { passo: 3, ms: 3100 },
  { passo: 4, ms: 2000 },
];

function Linha({
  hora,
  nome,
  servico,
  status,
  destaque,
}: {
  hora: string;
  nome: string;
  servico: string;
  status: StatusAgendamento;
  destaque?: boolean;
}) {
  return (
    <div className="demo-linha" data-destaque={destaque || undefined}>
      <span className="demo-linha-hora num">{hora}</span>
      <span className="demo-linha-no" />
      <span className="demo-linha-cartao">
        <Avatar nome={nome} tamanho={32} />
        <span className="demo-linha-texto">
          <span className="demo-linha-nome">{nome}</span>
          <span className="demo-linha-servico">{servico} · Rafael</span>
        </span>
        <StatusBadge status={status} />
      </span>
    </div>
  );
}

export function DemoAgenda() {
  const ref = useRef<HTMLElement>(null);
  const idLegenda = useId();
  // null = estado parado e completo (servidor, sem JS, movimento reduzido)
  const [indice, setIndice] = useState<number | null>(null);
  const [pausado, setPausado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [abaVisivel, setAbaVisivel] = useState(true);
  const [reduzido, setReduzido] = useState(true);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const atualizar = () => {
      setReduzido(consulta.matches);
      if (consulta.matches) setIndice(null);
    };
    atualizar();
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const observador = new IntersectionObserver(([entrada]) => setVisivel(entrada.isIntersecting), { threshold: 0.35 });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    const atualizar = () => setAbaVisivel(!document.hidden);
    document.addEventListener("visibilitychange", atualizar);
    return () => document.removeEventListener("visibilitychange", atualizar);
  }, []);

  const tocando = !reduzido && !pausado && visivel && abaVisivel;

  useEffect(() => {
    if (!tocando) return;
    if (indice === null) {
      setIndice(0);
      return;
    }
    const temporizador = window.setTimeout(() => setIndice((indice + 1) % SEQUENCIA.length), SEQUENCIA[indice].ms);
    return () => window.clearTimeout(temporizador);
  }, [tocando, indice]);

  const passo = indice === null ? -1 : SEQUENCIA[indice].passo;
  const escolhido = passo === -1 || passo >= 1;
  const confirmando = passo === 2;
  const confirmado = passo >= 3;
  const naAgenda = passo === -1 || passo >= 3;
  // No estado parado e completo o agendamento novo também aparece aceso.
  const destaque = passo === -1 || passo === 3;

  return (
    <figure ref={ref} className="demo" aria-labelledby={idLegenda} data-animada={indice !== null || undefined}>
      <div className="demo-quadro" aria-hidden="true">
        <div className="demo-painel demo-reserva">
          <div className="demo-painel-topo">
            <span className="demo-painel-titulo">Link de agendamento</span>
            <span className="demo-painel-sub">Barbearia Exemplo</span>
          </div>
          {confirmado ? (
            <div className="demo-confirmado">
              <span className="confirmacao-icone">
                <CheckCircle2 size={24} />
              </span>
              <span className="demo-confirmado-titulo">Horário confirmado</span>
              <span className="demo-confirmado-sub num">Terça, 25/11 às 14:00</span>
              <span className="demo-confirmado-sub">Corte + barba · com Rafael</span>
            </div>
          ) : (
            <div className="demo-escolha">
              <span className="demo-escolha-servico">Corte + barba · com Rafael</span>
              <span className="demo-escolha-dia num">Terça, 25/11</span>
              <span className="horarios demo-horarios">
                {HORARIOS.map((h) => (
                  <span key={h} className="horario" data-escolhido={(escolhido && h === "14:00") || undefined}>
                    {h}
                  </span>
                ))}
              </span>
              <span className="btn btn-primary btn-bloco demo-confirmar" data-pressionado={confirmando || undefined}>
                {confirmando ? "Confirmando…" : "Confirmar horário"}
              </span>
            </div>
          )}
        </div>

        <div className="demo-painel demo-agenda">
          <div className="demo-painel-topo">
            <span className="demo-painel-titulo">Agenda de hoje</span>
            <span className="demo-painel-sub num">{naAgenda ? 3 : 2} atendimentos</span>
          </div>
          <div className="demo-linhas">
            <Linha hora="13:00" nome="Carlos Lima" servico="Corte" status="CONCLUIDO" />
            <div className="demo-linha-espaco" data-aberto={naAgenda || undefined}>
              <div>
                <Linha hora="14:00" nome="Lucas Andrade" servico="Corte + barba" status="CONFIRMADO" destaque={destaque} />
              </div>
            </div>
            <Linha hora="14:40" nome="Bruno Costa" servico="Corte" status="CONFIRMADO" />
          </div>
        </div>
      </div>

      <figcaption id={idLegenda} className="demo-legenda">
        <span>Exemplo com dados fictícios: o cliente escolhe 14:00 pelo link e o horário entra na agenda do dia, confirmado.</span>
        {!reduzido && (
          <span className="demo-controles">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPausado((p) => !p)}>
              {pausado ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
              {pausado ? "Continuar" : "Pausar"}
              <span className="sr-only"> a demonstração</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setIndice(0);
                setPausado(false);
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Repetir
              <span className="sr-only"> a demonstração</span>
            </button>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
