"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarX2, Clock, MessageCircle } from "lucide-react";
import type { StatusAgendamento } from "@prisma/client";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import { capitalizar, formatarDataInstante, formatarDiaCalendario, formatarHora, formatarMoeda } from "@/lib/formatar";
import { useFuso } from "@/components/fuso-contexto";

interface HorarioVM {
  inicio: string;
  fim: string;
  status: StatusAgendamento;
  servico: string;
  profissional: string;
  sinalPago: number | null;
}

type Modo = "ver" | "mudar" | "cancelar";

// Dia (meia-noite UTC que representa o dia em Brasília) → AAAA-MM-DD, o
// formato que a rota de horários espera.
function chaveDia(dia: Date): string {
  return `${dia.getUTCFullYear()}-${String(dia.getUTCMonth() + 1).padStart(2, "0")}-${String(dia.getUTCDate()).padStart(2, "0")}`;
}

function proximosDias(fuso: string, quantidade: number): Date[] {
  const hoje = inicioDoDiaBrasil(new Date(), fuso);
  return Array.from({ length: quantidade }, (_, i) => new Date(hoje.getTime() + i * 24 * 60 * 60 * 1000));
}

function quando(iso: string, fuso: string): string {
  const d = new Date(iso);
  return capitalizar(formatarDataInstante(d, { weekday: "long", day: "2-digit", month: "long" }, fuso));
}

export function GerenciarHorario({
  codigo,
  agendamento: ag,
  podeAlterar,
  antecedenciaHoras,
  diasAFrente,
  whatsappBarbearia,
  linkAgendar,
}: {
  codigo: string;
  agendamento: HorarioVM;
  podeAlterar: boolean;
  antecedenciaHoras: number;
  // Até quantos dias à frente a barbearia aceita (Configurações).
  diasAFrente: number;
  whatsappBarbearia: string | null;
  linkAgendar: string;
}) {
  const fuso = useFuso();
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("ver");
  const [dia, setDia] = useState<Date | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setEscolhido(null);
    if (!dia) return;
    let ativo = true;
    setCarregando(true);
    setErro(null);
    fetch(`/api/publico/horario/${encodeURIComponent(codigo)}/horarios?data=${chaveDia(dia)}`)
      .then(async (r) => {
        const dados = await r.json().catch(() => null);
        if (!ativo) return;
        if (!r.ok) {
          setErro(dados?.erro ?? "Não foi possível carregar os horários.");
          setHorarios([]);
          return;
        }
        setHorarios(dados.horarios);
      })
      .catch(() => {
        if (ativo) {
          setErro("Falha de conexão ao carregar os horários.");
          setHorarios([]);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [dia, codigo]);

  async function enviar(corpo: { acao: "cancelar" } | { acao: "remarcar"; inicio: string }) {
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/publico/horario/${encodeURIComponent(codigo)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = await r.json().catch(() => null);
      if (!r.ok) {
        setErro(dados?.erro ?? "Não foi possível concluir. Tente de novo.");
        return;
      }
      setAviso(
        corpo.acao === "cancelar"
          ? null
          : `Pronto! Seu horário mudou para ${quando(corpo.inicio, fuso).toLowerCase()} às ${formatarHora(new Date(corpo.inicio), fuso)}. A barbearia já foi avisada.`,
      );
      setModo("ver");
      setDia(null);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const falarComBarbearia = whatsappBarbearia && (
    <a href={whatsappBarbearia} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
      <MessageCircle size={18} aria-hidden="true" />
      Falar com a barbearia
    </a>
  );

  if (ag.status === "CANCELADO") {
    return (
      <section className="card confirmacao" aria-live="polite">
        <span className="confirmacao-icone" data-tom="atencao" aria-hidden="true">
          <CalendarX2 size={28} />
        </span>
        <h2 className="etapa-titulo">Horário cancelado</h2>
        <p className="texto-secundario">
          {ag.servico} com {ag.profissional}, {quando(ag.inicio, fuso).toLowerCase()} às {formatarHora(new Date(ag.inicio), fuso)}.
        </p>
        {ag.sinalPago !== null && (
          <p className="texto-secundario">
            Você pagou um sinal de {formatarMoeda(ag.sinalPago)}. Sobre a devolução, fale com a barbearia.
          </p>
        )}
        <Link href={linkAgendar} className="btn btn-primary">
          Marcar outro horário
        </Link>
      </section>
    );
  }

  if (ag.status !== "CONFIRMADO") {
    return (
      <section className="card confirmacao">
        <span className="confirmacao-icone" aria-hidden="true">
          <Clock size={28} />
        </span>
        <h2 className="etapa-titulo">
          {ag.status === "AGUARDANDO_PAGAMENTO"
            ? "Aguardando o pagamento do sinal"
            : ag.status === "CHEGOU" || ag.status === "EM_ATENDIMENTO"
              ? "Seu atendimento está em andamento"
              : "Este atendimento já passou"}
        </h2>
        {ag.status !== "CHEGOU" && ag.status !== "EM_ATENDIMENTO" && (
          <Link href={linkAgendar} className="btn btn-primary">
            Marcar um horário
          </Link>
        )}
      </section>
    );
  }

  return (
    <div className="pilha">
      {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}

      <section className="card pilha-sm" aria-labelledby="titulo-horario">
        <h2 id="titulo-horario" className="etapa-titulo" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <CalendarCheck size={20} aria-hidden="true" />
          Horário marcado
        </h2>
        <dl className="fatos">
          <div>
            <dt>Serviço</dt>
            <dd>{ag.servico}</dd>
          </div>
          <div>
            <dt>Profissional</dt>
            <dd>{ag.profissional}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{quando(ag.inicio, fuso)}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>
              {formatarHora(new Date(ag.inicio), fuso)} – {formatarHora(new Date(ag.fim), fuso)}
            </dd>
          </div>
          {ag.sinalPago !== null && (
            <div>
              <dt>Sinal pago</dt>
              <dd>{formatarMoeda(ag.sinalPago)}</dd>
            </div>
          )}
        </dl>

        {!podeAlterar ? (
          <>
            <Alerta tom="atencao">
              Faltam menos de {antecedenciaHoras} horas para o seu horário. Para mudar ou cancelar agora, fale com a
              barbearia.
            </Alerta>
            {falarComBarbearia}
          </>
        ) : modo === "ver" ? (
          <div className="form-acoes">
            <Botao
              variante="primary"
              onClick={() => {
                setAviso(null);
                setErro(null);
                setModo("mudar");
              }}
            >
              Mudar horário
            </Botao>
            <Botao
              variante="danger-outline"
              onClick={() => {
                setAviso(null);
                setErro(null);
                setModo("cancelar");
              }}
            >
              Cancelar horário
            </Botao>
          </div>
        ) : null}
      </section>

      {podeAlterar && modo === "cancelar" && (
        <section className="card pilha-sm" aria-labelledby="titulo-cancelar">
          <h2 id="titulo-cancelar" className="etapa-titulo">
            Cancelar este horário?
          </h2>
          <p className="texto-secundario">
            O horário fica livre para outra pessoa e a barbearia é avisada.
            {ag.sinalPago !== null && ` O sinal de ${formatarMoeda(ag.sinalPago)} fica com a barbearia; sobre a devolução, fale com ela.`}
          </p>
          {erro && <Alerta tom="perigo">{erro}</Alerta>}
          <div className="form-acoes">
            <Botao onClick={() => setModo("ver")} disabled={enviando}>
              Voltar
            </Botao>
            <Botao
              variante="danger"
              onClick={() => enviar({ acao: "cancelar" })}
              carregando={enviando}
              textoCarregando="Cancelando…"
            >
              Sim, cancelar
            </Botao>
          </div>
        </section>
      )}

      {podeAlterar && modo === "mudar" && (
        <section className="card pilha-sm etapa" aria-labelledby="titulo-mudar">
          <h2 id="titulo-mudar" className="etapa-titulo">
            Escolha o novo dia e horário
          </h2>
          <p className="texto-secundario">
            Com {ag.profissional}, {ag.servico.toLowerCase()}.
          </p>
          <div className="dias-rolagem" role="group" aria-label="Dias">
            {proximosDias(fuso, diasAFrente).map((d) => (
              <button
                key={chaveDia(d)}
                type="button"
                onClick={() => setDia(d)}
                className="faixa-dia"
                aria-pressed={dia !== null && chaveDia(dia) === chaveDia(d)}
                aria-label={capitalizar(formatarDiaCalendario(d, { weekday: "long", day: "2-digit", month: "long" }))}
              >
                <span>{capitalizar(formatarDiaCalendario(d, { weekday: "short" }).replace(".", ""))}</span>
                <span className="faixa-dia-numero">{formatarDiaCalendario(d, { day: "2-digit" })}</span>
                <span>{formatarDiaCalendario(d, { month: "short" }).replace(".", "")}</span>
              </button>
            ))}
          </div>

          {dia && (
            <div aria-live="polite" aria-busy={carregando}>
              {carregando ? (
                <p className="texto-secundario" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="spinner" aria-hidden="true" />
                  Carregando horários…
                </p>
              ) : horarios && horarios.length === 0 ? (
                !erro && <p className="texto-secundario">Sem horários livres nesse dia. Tente outro dia.</p>
              ) : horarios ? (
                <div className="horarios" role="group" aria-label="Horários livres">
                  {horarios.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className="horario"
                      aria-pressed={escolhido === h}
                      onClick={() => setEscolhido(h)}
                    >
                      {formatarHora(new Date(h), fuso)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {erro && <Alerta tom="perigo">{erro}</Alerta>}
          <div className="form-acoes">
            <Botao onClick={() => setModo("ver")} disabled={enviando}>
              Voltar
            </Botao>
            <Botao
              variante="primary"
              disabled={!escolhido}
              onClick={() => escolhido && enviar({ acao: "remarcar", inicio: escolhido })}
              carregando={enviando}
              textoCarregando="Salvando…"
            >
              {escolhido ? `Mudar para ${formatarHora(new Date(escolhido), fuso)}` : "Escolha um horário"}
            </Botao>
          </div>
        </section>
      )}
    </div>
  );
}
