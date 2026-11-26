"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck, Check, CheckCircle2, ChevronDown, RotateCcw, Scissors } from "lucide-react";
import { SimboloBarbium } from "@/components/ui/marca";

// A abertura da landing: o dia da barbearia como uma régua de horários.
// No computador, a régua atravessa a página e o celular do link de
// agendamento fica em pé sobre as 14:00; no celular, um "14:00" enorme com o
// cartão do link por cima e a agenda de hoje embaixo. Nos dois, a mesma cena,
// uma vez: o cliente toca em 14:00, confirma, e o horário cai na agenda.
// Dados fictícios, identificados na legenda. Com movimento reduzido, a cena
// já aparece no estado final.

type Bloco = { inicio: string; fim: string; nome: string; servico?: string; iniciais?: string; pausa?: boolean };

const INICIO_DIA = 9 * 60;
const FIM_DIA = 18 * 60;
const HORAS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const AGORA = "13:30";

const BLOCOS: Bloco[] = [
  { inicio: "09:00", fim: "09:40", nome: "Carlos", servico: "Corte", iniciais: "CL" },
  { inicio: "10:20", fim: "11:00", nome: "Bruno", servico: "Corte", iniciais: "BC" },
  { inicio: "12:00", fim: "13:00", nome: "Almoço", pausa: true },
  { inicio: "15:20", fim: "16:00", nome: "Diego", servico: "Corte", iniciais: "DS" },
  { inicio: "17:00", fim: "17:40", nome: "André", servico: "Corte + barba", iniciais: "AM" },
];
const NOVO: Bloco = { inicio: "14:00", fim: "14:40", nome: "Lucas", servico: "Corte + barba", iniciais: "LA" };

// Etapas da cena, em ms a partir do início (depois da entrada da abertura).
// 1: toque em 14:00 · 2: confirmar afunda (240ms) · 3: confirma e o horário
// desce · 4: assenta e fica verde.
const ROTEIRO: [number, number][] = [
  [1, 500],
  [2, 900],
  [3, 1180],
  [4, 1840],
];
const ESPERA_INICIAL_MS = 600;

function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

// Posição e largura na régua, em % do dia mostrado.
function noDia(bloco: Bloco): { left: string; width: string } {
  const total = FIM_DIA - INICIO_DIA;
  return {
    left: `${((minutos(bloco.inicio) - INICIO_DIA) / total) * 100}%`,
    width: `${((minutos(bloco.fim) - minutos(bloco.inicio)) / total) * 100}%`,
  };
}

function BlocoRegua({ bloco, novo = false }: { bloco: Bloco; novo?: boolean }) {
  return (
    <div
      className={`rg-bloco${bloco.pausa ? " rg-bloco-pausa" : ""}${novo ? " rg-bloco-novo" : ""}`}
      style={noDia(bloco)}
    >
      {bloco.iniciais && <span className="rg-bloco-avatar">{bloco.iniciais}</span>}
      <span className="rg-bloco-texto">
        <span className="rg-bloco-nome">
          {bloco.nome}
          {bloco.servico && <span className="rg-bloco-servico"> · {bloco.servico}</span>}
        </span>
        <span className="rg-bloco-hora num">
          {bloco.inicio}
          <span className="rg-bloco-fim"> – {bloco.fim}</span>
        </span>
      </span>
    </div>
  );
}

// A tela do link de agendamento. Fica sempre na escolha, com 14:00 marcado;
// só o botão troca para "Horário confirmado", como no cartão do celular.
function TelaCelular() {
  return (
    <div className="rg-celular-tela">
      <div className="rg-tela">
        <p className="rg-tela-marca">
          <SimboloBarbium tamanho={12} />
          barbium
        </p>
        <p className="rg-tela-barbearia">Barbearia Exemplo</p>
        <p className="rg-tela-sub">Agende seu horário</p>
        <p className="rg-tela-campo">
          <Scissors size={12} aria-hidden="true" />
          <span>Corte + barba</span>
          <ChevronDown size={12} aria-hidden="true" />
        </p>
        <p className="rg-tela-rotulo">Escolha um horário</p>
        <div className="rg-tela-horarios">
          <span className="rg-slot num">13:00</span>
          <span className="rg-slot rg-slot-alvo num">
            14:00
            <Check size={12} strokeWidth={3} aria-hidden="true" />
          </span>
          <span className="rg-slot num">14:40</span>
        </div>
        <div className="rg-acao">
          <span className="rg-confirmar">Confirmar horário</span>
          <span className="rg-confirmado">
            <Check size={13} strokeWidth={2.5} aria-hidden="true" />
            Horário confirmado
          </span>
        </div>
      </div>
    </div>
  );
}

export function ReguaDoDia() {
  const raiz = useRef<HTMLDivElement>(null);
  const temporizadores = useRef<number[]>([]);
  const [etapa, setEtapa] = useState(0);
  const [reiniciando, setReiniciando] = useState(false);

  const limpar = () => {
    temporizadores.current.forEach((t) => window.clearTimeout(t));
    temporizadores.current = [];
  };

  const rodar = useCallback((espera: number) => {
    limpar();
    for (const [proxima, ms] of ROTEIRO) {
      temporizadores.current.push(window.setTimeout(() => setEtapa(proxima), espera + ms));
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEtapa(4);
      return;
    }
    // Começa quando o desfecho está à vista: no computador, a régua (no
    // carregamento, quase sempre já está); no celular, a linha da agenda que
    // recebe o horário, inteira na tela.
    const computador = window.matchMedia("(min-width: 1024px)").matches;
    const alvo = computador ? raiz.current : raiz.current?.querySelector(".rg-linha-nova");
    if (!alvo || !("IntersectionObserver" in window)) {
      setEtapa(4);
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          observador.disconnect();
          rodar(ESPERA_INICIAL_MS);
        }
      },
      { threshold: computador ? 0.35 : 1 },
    );
    observador.observe(alvo);
    return () => {
      observador.disconnect();
      limpar();
    };
  }, [rodar]);

  // Repetir: volta ao começo sem animar de trás pra frente, e roda de novo.
  function repetir() {
    limpar();
    setReiniciando(true);
    setEtapa(0);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setReiniciando(false);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setEtapa(4);
        else rodar(200);
      }),
    );
  }

  const estado = {
    "data-escolhido": etapa >= 1 || undefined,
    "data-tocando": etapa === 1 || undefined,
    "data-confirmando": etapa === 2 || undefined,
    "data-confirmado": etapa >= 3 || undefined,
    "data-assentado": etapa >= 4 || undefined,
    "data-reiniciando": reiniciando || undefined,
  };

  return (
    <div className="rg" ref={raiz} {...estado}>
      {/* Computador: a régua do dia com o celular em pé sobre as 14:00 */}
      <div className="rg-palco" aria-hidden="true">
        <div className="rg-celular" style={{ left: noDia(NOVO).left }}>
          <TelaCelular />
        </div>
        <div className="rg-regua">
          <div className="rg-regua-topo">
            <span className="rg-regua-titulo">Agenda de hoje · Rafael</span>
            <span className="rg-regua-contagem num">
              <span className="rg-contagem-antes">4 atendimentos</span>
              <span className="rg-contagem-depois">5 atendimentos</span>
            </span>
          </div>
          <div className="rg-faixa">
            {HORAS.map((h) => (
              <span
                key={h}
                className="rg-hora num"
                style={{ left: `${((h * 60 - INICIO_DIA) / (FIM_DIA - INICIO_DIA)) * 100}%` }}
              >
                {String(h).padStart(2, "0")}
              </span>
            ))}
            <span className="rg-agora" style={{ left: noDia({ inicio: AGORA, fim: AGORA, nome: "" }).left }}>
              <span className="rg-agora-rotulo">agora</span>
            </span>
            <div className="rg-blocos">
              {BLOCOS.map((b) => (
                <BlocoRegua key={b.inicio} bloco={b} />
              ))}
              <div className="rg-vao" style={noDia(NOVO)}>
                Livre
              </div>
              <BlocoRegua bloco={NOVO} novo />
            </div>
            {/* Do celular até o vão das 14:00, enquanto o horário desce */}
            <svg className="rg-seta" style={{ left: noDia({ inicio: "14:20", fim: "14:20", nome: "" }).left }} viewBox="0 0 12 68" aria-hidden="true">
              <path d="M6 0V62" strokeDasharray="3 4" />
              <path d="M1.5 57.5L6 62l4.5-4.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Celular: o horário enorme, o cartão do link e a agenda de hoje */}
      <div className="rg-movel" aria-hidden="true">
        <p className="rg-gigante num">14:00</p>
        <div className="rg-cartao">
          <p className="rg-cartao-titulo">Corte + barba · com Rafael</p>
          <p className="rg-cartao-sub num">Terça, 25/11</p>
          <div className="rg-cartao-horarios">
            <span className="rg-slot num">13:00</span>
            <span className="rg-slot num">13:40</span>
            <span className="rg-slot rg-slot-alvo num">14:00</span>
            <span className="rg-slot num">14:40</span>
          </div>
          <div className="rg-acao">
            <span className="rg-confirmar">Confirmar horário</span>
            <span className="rg-confirmado">
              <Check size={18} strokeWidth={2.5} aria-hidden="true" />
              Horário confirmado
            </span>
          </div>
        </div>
        <div className="rg-lista">
          <p className="rg-lista-titulo">Agenda de hoje</p>
          <div className="rg-linha">
            <span className="rg-linha-hora num">13:00</span>
            <span className="rg-linha-nome">Carlos Lima</span>
            <span className="badge" data-tom="sucesso">
              <CheckCircle2 size={13} strokeWidth={2.2} aria-hidden="true" />
              Concluído
            </span>
          </div>
          <div className="rg-linha rg-linha-nova">
            <span className="rg-linha-hora num">14:00</span>
            <span className="rg-linha-vao">Livre</span>
            <span className="rg-linha-chegou">
              <span className="rg-linha-nome">Lucas Andrade</span>
              <span className="badge" data-tom="info">
                <CalendarCheck size={13} strokeWidth={2.2} aria-hidden="true" />
                Confirmado
              </span>
            </span>
          </div>
          <div className="rg-linha">
            <span className="rg-linha-hora num">14:40</span>
            <span className="rg-linha-nome">Bruno Costa</span>
            <span className="badge" data-tom="info">
              <CalendarCheck size={13} strokeWidth={2.2} aria-hidden="true" />
              Confirmado
            </span>
          </div>
        </div>
      </div>

      <div className="rg-legenda">
        <p>Exemplo com dados fictícios: o cliente escolhe 14:00 pelo link e o horário entra na agenda do dia, confirmado.</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={repetir}>
          <RotateCcw size={16} aria-hidden="true" />
          Repetir
        </button>
      </div>
    </div>
  );
}
