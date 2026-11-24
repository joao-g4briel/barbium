"use client";

import { useEffect, useId, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alerta } from "@/components/ui/alerta";
import { formatarHora } from "@/lib/formatar";
import type { AgendamentoVM } from "./tipos";
import { useFuso } from "@/components/fuso-contexto";

export interface HorarioEscolhido {
  inicio: string;
  profissionalId: string;
}

// Dia (AAAA-MM-DD) de um instante no horário de Brasília — é o formato do
// <input type="date"> e o que a rota de horários espera.
export function chaveDiaBrasil(instante: Date, fuso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}

// Escolha do novo dia, profissional (só o dono troca) e horário de um
// agendamento. Os horários vêm da mesma regra do agendamento novo pelo
// painel; o lugar que o agendamento ocupa hoje conta como livre.
export function MudarHorario({
  ag,
  profissionais,
  agoraMs,
  desabilitado,
  erro,
  aoMudar,
}: {
  ag: AgendamentoVM;
  // Vazio pro barbeiro: ele só muda o horário na própria agenda.
  profissionais: { id: string; nome: string }[];
  agoraMs: number;
  desabilitado: boolean;
  erro: string | null;
  aoMudar: (escolha: HorarioEscolhido | null) => void;
}) {
  const fuso = useFuso();
  const id = useId();
  const hoje = chaveDiaBrasil(new Date(agoraMs), fuso);
  const diaAtual = chaveDiaBrasil(new Date(ag.inicio), fuso);
  const [data, setData] = useState(diaAtual < hoje ? hoje : diaAtual);
  const [profissionalId, setProfissionalId] = useState(ag.profissional.id);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [horario, setHorario] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroHorarios, setErroHorarios] = useState<string | null>(null);

  // Profissional desativado depois do agendamento continua na lista só pra
  // marcar de onde se está saindo (a API não aceita mantê-lo).
  const opcoesProfissional = profissionais.some((p) => p.id === ag.profissional.id)
    ? profissionais
    : [ag.profissional, ...profissionais];
  const podeTrocarProfissional = profissionais.length > 1;

  useEffect(() => {
    setHorario(null);
    aoMudar(null);
    if (!data) return;
    let ativo = true;
    setCarregando(true);
    setErroHorarios(null);
    const parametros = new URLSearchParams({ agendamentoId: ag.id, profissionalId, data });
    fetch(`/api/painel/horarios?${parametros}`)
      .then(async (resposta) => {
        const dados = await resposta.json().catch(() => null);
        if (!ativo) return;
        if (!resposta.ok) {
          setErroHorarios(dados?.erro ?? "Não foi possível carregar os horários.");
          setHorarios([]);
          return;
        }
        setHorarios(dados.horarios);
      })
      .catch(() => {
        if (ativo) {
          setErroHorarios("Falha de conexão ao carregar os horários.");
          setHorarios([]);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
    // aoMudar muda a cada render do pai; só dia e profissional recarregam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ag.id, data, profissionalId]);

  function escolher(h: string) {
    setHorario(h);
    aoMudar({ inicio: h, profissionalId });
  }

  const mesmoLugar = (h: string) => h === ag.inicio && profissionalId === ag.profissional.id;
  const duracaoMs = Date.parse(ag.fim) - Date.parse(ag.inicio);
  const nomeProfissional = opcoesProfissional.find((p) => p.id === profissionalId)?.nome ?? ag.profissional.nome;

  return (
    <div className="fatos-edicao">
      <dt>
        <label htmlFor={`${id}-data`}>Novo horário</label>
      </dt>
      <dd>
        <input
          id={`${id}-data`}
          type="date"
          className="input"
          value={data}
          min={hoje}
          onChange={(e) => e.target.value && setData(e.target.value)}
          disabled={desabilitado}
          autoFocus
        />
        {podeTrocarProfissional && (
          <select
            className="input"
            aria-label="Profissional"
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
            disabled={desabilitado}
          >
            {opcoesProfissional.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
                {p.id === ag.profissional.id ? " (atual)" : ""}
              </option>
            ))}
          </select>
        )}
        <div aria-live="polite" aria-busy={carregando}>
          {carregando ? (
            <p className="pix-espera">
              <span className="spinner" aria-hidden="true" />
              Carregando horários…
            </p>
          ) : erroHorarios ? (
            <Alerta tom="perigo">{erroHorarios}</Alerta>
          ) : horarios && horarios.length === 0 ? (
            <p className="texto-secundario">
              Sem horários livres nesse dia{podeTrocarProfissional ? ` para ${nomeProfissional}` : ""}. Tente outra
              data{podeTrocarProfissional ? " ou outro profissional" : ""}.
            </p>
          ) : horarios ? (
            <div className="horarios" role="group" aria-label="Horários livres">
              {horarios.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="horario"
                  aria-pressed={horario === h}
                  disabled={desabilitado || mesmoLugar(h)}
                  title={mesmoLugar(h) ? "Horário atual" : undefined}
                  aria-label={mesmoLugar(h) ? `${formatarHora(new Date(h), fuso)} (horário atual)` : undefined}
                  onClick={() => escolher(h)}
                >
                  {formatarHora(new Date(h), fuso)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {horario && (
          <p className="campo-dica">
            Fica {formatarHora(new Date(horario), fuso)} – {formatarHora(new Date(Date.parse(horario) + duracaoMs), fuso)}
            {podeTrocarProfissional ? ` com ${nomeProfissional}` : ""}. O cliente recebe o novo horário no WhatsApp,
            se aceitar mensagens.
          </p>
        )}
        {erro && (
          <p className="campo-erro" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            {erro}
          </p>
        )}
      </dd>
    </div>
  );
}
