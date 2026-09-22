"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface Servico {
  id: string;
  nome: string;
  duracaoMinutos: number;
  preco: number;
}

interface Profissional {
  id: string;
  nome: string;
}

interface Props {
  slug: string;
  servicos: Servico[];
  profissionais: Profissional[];
}

function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function rotuloDia(data: Date): string {
  const rotulo = data.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

function chaveDia(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function proximosDiasCliente(quantidade: number): Date[] {
  const dias: Date[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < quantidade; i++) {
    const dia = new Date(hoje);
    dia.setDate(dia.getDate() + i);
    dias.push(dia);
  }
  return dias;
}

function ResumoPasso({
  rotulo,
  valor,
  onTrocar,
}: {
  rotulo: string;
  valor: string;
  onTrocar: () => void;
}) {
  return (
    <div className="card resumo-passo">
      <div style={{ minWidth: 0 }}>
        <p className="resumo-passo-rotulo">{rotulo}</p>
        <p className="resumo-passo-valor">{valor}</p>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onTrocar}>
        Trocar
      </button>
    </div>
  );
}

export function AssistenteAgendamento({ slug, servicos, profissionais }: Props) {
  const [servico, setServico] = useState<Servico | null>(null);
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [dia, setDia] = useState<Date | null>(null);
  const [horario, setHorario] = useState<Date | null>(null);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<Date[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const dias = proximosDiasCliente(7);

  function trocarServico() {
    setServico(null);
    setProfissional(null);
    setDia(null);
    setHorario(null);
    setHorariosDisponiveis([]);
    setErro(null);
  }

  function trocarProfissional() {
    setProfissional(null);
    setDia(null);
    setHorario(null);
    setHorariosDisponiveis([]);
    setErro(null);
  }

  function trocarHorario() {
    setDia(null);
    setHorario(null);
    setHorariosDisponiveis([]);
    setErro(null);
  }

  function recomecar() {
    trocarServico();
    setNome("");
    setTelefone("");
    setConfirmado(false);
    setConfirmando(false);
  }

  async function aoEscolherDia(diaEscolhido: Date) {
    if (!servico || !profissional) return;
    setDia(diaEscolhido);
    setHorario(null);
    setCarregandoHorarios(true);
    setErro(null);

    try {
      const parametros = new URLSearchParams({
        servicoId: servico.id,
        profissionalId: profissional.id,
        data: chaveDia(diaEscolhido),
      });
      const resposta = await fetch(`/api/publico/${slug}/horarios?${parametros}`);
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível carregar os horários.");
        setHorariosDisponiveis([]);
        return;
      }

      setHorariosDisponiveis(dados.horarios.map((h: string) => new Date(h)));
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregandoHorarios(false);
    }
  }

  async function confirmar() {
    if (!servico || !profissional || !horario) return;
    setConfirmando(true);
    setErro(null);

    try {
      const resposta = await fetch(`/api/publico/${slug}/agendamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicoId: servico.id,
          profissionalId: profissional.id,
          inicio: horario.toISOString(),
          nome,
          telefone,
        }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível confirmar o agendamento.");
        setConfirmando(false);
        return;
      }

      setConfirmado(true);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setConfirmando(false);
    }
  }

  if (confirmado && servico && profissional && horario) {
    return (
      <div className="card" style={{ display: "grid", gap: 10, textAlign: "center", padding: 28 }}>
        <CheckCircle2 size={40} color="var(--neon)" style={{ margin: "0 auto" }} />
        <p style={{ color: "var(--neon)", fontWeight: 700, margin: 0, fontSize: "1.0625rem" }}>
          Agendamento confirmado!
        </p>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {servico.nome} com {profissional.nome}
        </p>
        <p style={{ margin: 0, fontWeight: 700 }}>
          {horario.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          {" às "}
          {horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={recomecar}>
          Fazer outro agendamento
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Passo 1 — serviço */}
      {servico ? (
        <ResumoPasso
          rotulo="Serviço"
          valor={`${servico.nome} · ${formatarPreco(servico.preco)}`}
          onTrocar={trocarServico}
        />
      ) : (
        <div>
          <p className="wizard-step-label">Escolha o serviço</p>
          <div style={{ display: "grid", gap: 8 }}>
            {servicos.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServico(s)}
                className="option-row"
              >
                <div>
                  <strong>{s.nome}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                    {s.duracaoMinutos} min
                  </div>
                </div>
                <strong>{formatarPreco(s.preco)}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Passo 2 — profissional */}
      {servico && (
        profissional ? (
          <ResumoPasso rotulo="Profissional" valor={profissional.nome} onTrocar={trocarProfissional} />
        ) : (
          <div>
            <p className="wizard-step-label">Escolha o profissional</p>
            <div style={{ display: "grid", gap: 8 }}>
              {profissionais.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfissional(p)}
                  className="option-row"
                >
                  {p.nome}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {/* Passo 3 — dia e horário */}
      {servico && profissional && (
        horario && dia ? (
          <ResumoPasso
            rotulo="Data e horário"
            valor={`${dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
            onTrocar={trocarHorario}
          />
        ) : (
          <div>
            <p className="wizard-step-label">Escolha o dia e o horário</p>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {dias.map((d) => (
                <button
                  key={chaveDia(d)}
                  type="button"
                  onClick={() => aoEscolherDia(d)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    flex: "0 0 auto",
                    borderColor: dia && chaveDia(dia) === chaveDia(d) ? "var(--neon)" : undefined,
                    color: dia && chaveDia(dia) === chaveDia(d) ? "var(--neon)" : undefined,
                  }}
                >
                  {rotuloDia(d)}
                </button>
              ))}
            </div>

            {dia && (
              <div style={{ marginTop: 14 }}>
                {carregandoHorarios ? (
                  <p style={{ color: "var(--muted)" }}>Carregando horários…</p>
                ) : horariosDisponiveis.length === 0 ? (
                  <p style={{ color: "var(--muted)" }}>
                    Sem horários livres nesse dia. Tente outro dia.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {horariosDisponiveis.map((h) => (
                      <button
                        key={h.toISOString()}
                        type="button"
                        onClick={() => setHorario(h)}
                        className="btn btn-ghost btn-sm"
                      >
                        {h.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* Passo 4 — dados do cliente */}
      {servico && profissional && horario && (
        <div>
          <p className="wizard-step-label">Seus dados</p>
          <div className="card" style={{ display: "grid", gap: 16 }}>
            <div>
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="telefone">Telefone (com DDD)</label>
              <input
                id="telefone"
                className="input"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 91234-5678"
                required
              />
            </div>

            {erro && <p className="erro-form">{erro}</p>}

            <button
              type="button"
              className="btn btn-primary"
              disabled={confirmando || !nome || !telefone}
              onClick={confirmar}
            >
              {confirmando ? "Confirmando…" : "Confirmar agendamento"}
            </button>
          </div>
        </div>
      )}

      {erro && !horario && <p className="erro-form">{erro}</p>}
    </div>
  );
}
