"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROTULO_DIA_SEMANA } from "@/lib/dias-semana";
import type { DiaSemana } from "@prisma/client";

interface DiaExpediente {
  diaSemana: DiaSemana;
  atende: boolean;
  horaInicio: string;
  horaFim: string;
  almocoInicio: string | null;
  almocoFim: string | null;
}

export function FormularioExpediente({ diasIniciais }: { diasIniciais: DiaExpediente[] }) {
  const router = useRouter();
  const [dias, setDias] = useState(diasIniciais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function atualizarDia(diaSemana: DiaSemana, alteracoes: Partial<DiaExpediente>) {
    setDias((atual) => atual.map((d) => (d.diaSemana === diaSemana ? { ...d, ...alteracoes } : d)));
    setSalvo(false);
  }

  async function salvar() {
    setErro(null);
    setSalvando(true);

    const resposta = await fetch("/api/painel/expediente", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => null);
      setErro(corpo?.erro ?? "Não foi possível salvar.");
      setSalvando(false);
      return;
    }

    setSalvando(false);
    setSalvo(true);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {dias.map((dia) => (
        <div key={dia.diaSemana} className="card" style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={dia.atende}
              onChange={(e) => atualizarDia(dia.diaSemana, { atende: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <strong>{ROTULO_DIA_SEMANA[dia.diaSemana]}</strong>
          </label>

          {dia.atende && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label htmlFor={`inicio-${dia.diaSemana}`}>Início</label>
                  <input
                    id={`inicio-${dia.diaSemana}`}
                    type="time"
                    className="input"
                    value={dia.horaInicio}
                    onChange={(e) => atualizarDia(dia.diaSemana, { horaInicio: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`fim-${dia.diaSemana}`}>Fim</label>
                  <input
                    id={`fim-${dia.diaSemana}`}
                    type="time"
                    className="input"
                    value={dia.horaFim}
                    onChange={(e) => atualizarDia(dia.diaSemana, { horaFim: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label htmlFor={`almoco-inicio-${dia.diaSemana}`}>Almoço (opcional)</label>
                  <input
                    id={`almoco-inicio-${dia.diaSemana}`}
                    type="time"
                    className="input"
                    value={dia.almocoInicio ?? ""}
                    onChange={(e) =>
                      atualizarDia(dia.diaSemana, { almocoInicio: e.target.value || null })
                    }
                  />
                </div>
                <div>
                  <label htmlFor={`almoco-fim-${dia.diaSemana}`}>até</label>
                  <input
                    id={`almoco-fim-${dia.diaSemana}`}
                    type="time"
                    className="input"
                    value={dia.almocoFim ?? ""}
                    onChange={(e) =>
                      atualizarDia(dia.diaSemana, { almocoFim: e.target.value || null })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {erro && <p className="erro-form">{erro}</p>}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar expediente"}
        </button>
        {salvo && <span style={{ color: "var(--neon)", fontSize: "0.875rem" }}>Salvo!</span>}
      </div>
    </div>
  );
}
