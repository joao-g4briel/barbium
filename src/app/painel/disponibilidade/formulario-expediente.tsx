"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check } from "lucide-react";
import { ROTULO_DIA_SEMANA } from "@/lib/dias-semana";
import type { DiaSemana } from "@prisma/client";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";

interface DiaExpediente {
  diaSemana: DiaSemana;
  atende: boolean;
  horaInicio: string;
  horaFim: string;
  almocoInicio: string | null;
  almocoFim: string | null;
}

// Mesmas regras da rota PUT /api/painel/expediente, mostradas no próprio dia.
function erroDoDia(dia: DiaExpediente): string | null {
  if (!dia.atende) return null;
  if (!dia.horaInicio || !dia.horaFim) return "Preencha início e fim do expediente.";
  if (dia.horaFim <= dia.horaInicio) return "O fim precisa ser depois do início.";
  if (Boolean(dia.almocoInicio) !== Boolean(dia.almocoFim)) {
    return "Preencha início e fim do almoço, ou deixe os dois em branco.";
  }
  if (dia.almocoInicio && dia.almocoFim && dia.almocoFim <= dia.almocoInicio) {
    return "O fim do almoço precisa ser depois do início.";
  }
  return null;
}

export function FormularioExpediente({ diasIniciais }: { diasIniciais: DiaExpediente[] }) {
  const router = useRouter();
  const [dias, setDias] = useState(diasIniciais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarErros, setMostrarErros] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function atualizarDia(diaSemana: DiaSemana, alteracoes: Partial<DiaExpediente>) {
    setDias((atual) => atual.map((d) => (d.diaSemana === diaSemana ? { ...d, ...alteracoes } : d)));
    setSalvo(false);
  }

  async function salvar() {
    setErro(null);
    setMostrarErros(true);
    if (dias.some((d) => erroDoDia(d))) return;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/expediente", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dias }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        setErro(corpo?.erro ?? "Não foi possível salvar.");
        return;
      }
      setSalvo(true);
      setMostrarErros(false);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Suas alterações continuam aqui — tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="card card-sem-padding" aria-labelledby="titulo-expediente">
      <div className="card-cabecalho">
        <div>
          <h2 id="titulo-expediente" className="card-titulo">
            Expediente semanal
          </h2>
          <p className="card-descricao">Os horários oferecidos no link de agendamento seguem este expediente.</p>
        </div>
      </div>

      <div>
        {dias.map((dia) => {
          const erroDia = mostrarErros ? erroDoDia(dia) : null;
          const id = dia.diaSemana.toLowerCase();
          return (
            <div key={dia.diaSemana} className="expediente-dia">
              <div className="expediente-dia-topo">
                <label className="interruptor">
                  <input
                    type="checkbox"
                    checked={dia.atende}
                    onChange={(e) => atualizarDia(dia.diaSemana, { atende: e.target.checked })}
                  />
                  <span className="interruptor-trilho" aria-hidden="true" />
                  {ROTULO_DIA_SEMANA[dia.diaSemana]}
                </label>
                {!dia.atende && <span className="texto-secundario texto-pequeno">Não atende</span>}
              </div>

              {dia.atende && (
                <>
                  <div className="expediente-dia-horarios">
                    <div className="campo">
                      <label htmlFor={`inicio-${id}`} className="campo-rotulo">
                        Início
                      </label>
                      <input
                        id={`inicio-${id}`}
                        type="time"
                        className="input num"
                        value={dia.horaInicio}
                        aria-invalid={erroDia ? true : undefined}
                        onChange={(e) => atualizarDia(dia.diaSemana, { horaInicio: e.target.value })}
                      />
                    </div>
                    <div className="campo">
                      <label htmlFor={`fim-${id}`} className="campo-rotulo">
                        Fim
                      </label>
                      <input
                        id={`fim-${id}`}
                        type="time"
                        className="input num"
                        value={dia.horaFim}
                        aria-invalid={erroDia ? true : undefined}
                        onChange={(e) => atualizarDia(dia.diaSemana, { horaFim: e.target.value })}
                      />
                    </div>
                    <div className="campo">
                      <label htmlFor={`almoco-inicio-${id}`} className="campo-rotulo">
                        Almoço <span className="campo-opcional">(opcional)</span>
                      </label>
                      <input
                        id={`almoco-inicio-${id}`}
                        type="time"
                        className="input num"
                        value={dia.almocoInicio ?? ""}
                        onChange={(e) => atualizarDia(dia.diaSemana, { almocoInicio: e.target.value || null })}
                      />
                    </div>
                    <div className="campo">
                      <label htmlFor={`almoco-fim-${id}`} className="campo-rotulo">
                        Fim do almoço
                      </label>
                      <input
                        id={`almoco-fim-${id}`}
                        type="time"
                        className="input num"
                        value={dia.almocoFim ?? ""}
                        onChange={(e) => atualizarDia(dia.diaSemana, { almocoFim: e.target.value || null })}
                      />
                    </div>
                  </div>
                  {erroDia && (
                    <p className="campo-erro" role="alert">
                      <AlertCircle size={14} aria-hidden="true" />
                      {erroDia}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="card-rodape">
        {erro && (
          <div style={{ flexBasis: "100%" }}>
            <Alerta tom="perigo">{erro}</Alerta>
          </div>
        )}
        <Botao variante="primary" onClick={salvar} carregando={salvando} textoCarregando="Salvando…">
          Salvar expediente
        </Botao>
        <span role="status" aria-live="polite">
          {salvo && (
            <span className="feedback-salvo">
              <Check size={16} aria-hidden="true" />
              Expediente salvo
            </span>
          )}
        </span>
      </div>
    </section>
  );
}
