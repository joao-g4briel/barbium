"use client";

import { useState, type FormEvent } from "react";
import { CalendarCheck, CheckCircle2, ChevronRight, Clock, Scissors, User } from "lucide-react";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import {
  capitalizar,
  formatarDataInstante,
  formatarDiaCalendario,
  formatarDuracao,
  formatarHora,
  formatarMoeda,
  apenasDigitos,
} from "@/lib/formatar";
import { Avatar } from "@/components/ui/avatar";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";

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

// Dias de calendário em Brasília (meia-noite UTC que representa o dia) —
// o mesmo formato que a rota de horários espera em `data`.
function chaveDia(dia: Date): string {
  return `${dia.getUTCFullYear()}-${String(dia.getUTCMonth() + 1).padStart(2, "0")}-${String(dia.getUTCDate()).padStart(2, "0")}`;
}

function proximosDias(quantidade: number): Date[] {
  const hoje = inicioDoDiaBrasil(new Date());
  return Array.from({ length: quantidade }, (_, i) => new Date(hoje.getTime() + i * 24 * 60 * 60 * 1000));
}

const PASSOS = ["Serviço", "Profissional", "Horário", "Seus dados"] as const;

function Passos({ atual }: { atual: number }) {
  return (
    <ol className="passos" aria-label="Etapas do agendamento">
      {PASSOS.map((passo, indice) => (
        <li
          key={passo}
          className="passo"
          data-estado={indice < atual ? "feito" : indice === atual ? "atual" : "pendente"}
          aria-current={indice === atual ? "step" : undefined}
        >
          {passo}
        </li>
      ))}
    </ol>
  );
}

function Escolha({
  icone,
  rotulo,
  valor,
  onTrocar,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  onTrocar: () => void;
}) {
  return (
    <div className="escolha-resumo">
      <span className="texto-secundario" aria-hidden="true">
        {icone}
      </span>
      <div className="escolha-resumo-texto">
        <p className="escolha-resumo-rotulo">{rotulo}</p>
        <p className="escolha-resumo-valor">{valor}</p>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onTrocar}>
        Trocar<span className="sr-only"> {rotulo.toLowerCase()}</span>
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
  const [errosCampos, setErrosCampos] = useState<{ nome?: string; telefone?: string }>({});
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  const dias = proximosDias(7);
  const passoAtual = !servico ? 0 : !profissional ? 1 : !horario ? 2 : 3;

  function trocarServico() {
    setServico(null);
    setProfissional(null);
    trocarHorario();
  }

  function trocarProfissional() {
    setProfissional(null);
    trocarHorario();
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
    setErrosCampos({});
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
      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível carregar os horários.");
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

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (!servico || !profissional || !horario) return;

    const validacao: { nome?: string; telefone?: string } = {};
    if (nome.trim().length < 2) validacao.nome = "Informe seu nome.";
    if (apenasDigitos(telefone).length < 8) validacao.telefone = "Informe um telefone válido, com DDD.";
    setErrosCampos(validacao);
    if (Object.keys(validacao).length > 0) return;

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
      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível confirmar o agendamento.");
        setConfirmando(false);
        return;
      }

      setConfirmado(true);
    } catch {
      setErro("Falha de conexão. Seus dados continuam aqui — tente novamente.");
      setConfirmando(false);
    }
  }

  if (confirmado && servico && profissional && horario) {
    return (
      <section className="card confirmacao" aria-live="polite">
        <span className="confirmacao-icone" aria-hidden="true">
          <CheckCircle2 size={28} />
        </span>
        <h2 className="etapa-titulo">Agendamento confirmado</h2>
        <dl className="fatos" style={{ width: "100%", textAlign: "left" }}>
          <div>
            <dt>Serviço</dt>
            <dd>{servico.nome}</dd>
          </div>
          <div>
            <dt>Profissional</dt>
            <dd>{profissional.nome}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{capitalizar(formatarDataInstante(horario, { weekday: "long", day: "2-digit", month: "long" }))}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>{formatarHora(horario)}</dd>
          </div>
        </dl>
        <Botao onClick={recomecar}>Fazer outro agendamento</Botao>
      </section>
    );
  }

  return (
    <div className="pilha">
      <Passos atual={passoAtual} />

      {servico && (
        <Escolha
          icone={<Scissors size={20} />}
          rotulo="Serviço"
          valor={`${servico.nome} · ${formatarMoeda(servico.preco)}`}
          onTrocar={trocarServico}
        />
      )}
      {profissional && (
        <Escolha icone={<User size={20} />} rotulo="Profissional" valor={profissional.nome} onTrocar={trocarProfissional} />
      )}
      {horario && dia && (
        <Escolha
          icone={<CalendarCheck size={20} />}
          rotulo="Data e horário"
          valor={`${capitalizar(formatarDiaCalendario(dia, { weekday: "short", day: "2-digit", month: "2-digit" }))} às ${formatarHora(horario)}`}
          onTrocar={trocarHorario}
        />
      )}

      {!servico && (
        <section className="etapa" aria-labelledby="etapa-servico">
          <h2 id="etapa-servico" className="etapa-titulo">
            Escolha o serviço
          </h2>
          <div className="opcoes">
            {servicos.map((s) => (
              <button key={s.id} type="button" onClick={() => setServico(s)} className="opcao">
                <span className="opcao-texto">
                  <span className="opcao-titulo">{s.nome}</span>
                  <span className="opcao-sub">
                    <Clock size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                    {formatarDuracao(s.duracaoMinutos)}
                  </span>
                </span>
                <span className="opcao-valor">{formatarMoeda(s.preco)}</span>
                <ChevronRight size={18} className="texto-secundario" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {servico && !profissional && (
        <section className="etapa" aria-labelledby="etapa-profissional">
          <h2 id="etapa-profissional" className="etapa-titulo">
            Com quem você quer ser atendido?
          </h2>
          <div className="opcoes">
            {profissionais.map((p) => (
              <button key={p.id} type="button" onClick={() => setProfissional(p)} className="opcao">
                <Avatar nome={p.nome} />
                <span className="opcao-texto">
                  <span className="opcao-titulo">{p.nome}</span>
                </span>
                <ChevronRight size={18} className="texto-secundario" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {servico && profissional && !horario && (
        <section className="etapa" aria-labelledby="etapa-horario">
          <h2 id="etapa-horario" className="etapa-titulo">
            Escolha o dia e o horário
          </h2>
          <div className="dias-rolagem" role="group" aria-label="Dias disponíveis">
            {dias.map((d) => {
              const selecionado = dia !== null && chaveDia(dia) === chaveDia(d);
              return (
                <button
                  key={chaveDia(d)}
                  type="button"
                  onClick={() => aoEscolherDia(d)}
                  className="faixa-dia"
                  aria-pressed={selecionado}
                  aria-label={capitalizar(formatarDiaCalendario(d, { weekday: "long", day: "2-digit", month: "long" }))}
                >
                  <span>{capitalizar(formatarDiaCalendario(d, { weekday: "short" }).replace(".", ""))}</span>
                  <span className="faixa-dia-numero">{formatarDiaCalendario(d, { day: "2-digit" })}</span>
                  <span>{formatarDiaCalendario(d, { month: "short" }).replace(".", "")}</span>
                </button>
              );
            })}
          </div>

          {erro && <Alerta tom="perigo">{erro}</Alerta>}

          {dia && (
            <div aria-live="polite" aria-busy={carregandoHorarios}>
              {carregandoHorarios ? (
                <p className="texto-secundario" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="spinner" aria-hidden="true" />
                  Carregando horários…
                </p>
              ) : horariosDisponiveis.length === 0 ? (
                !erro && (
                  <p className="texto-secundario">Sem horários livres nesse dia. Tente outro dia.</p>
                )
              ) : (
                <div className="horarios" role="group" aria-label="Horários livres">
                  {horariosDisponiveis.map((h) => (
                    <button
                      key={h.toISOString()}
                      type="button"
                      onClick={() => setHorario(h)}
                      className="horario"
                    >
                      {formatarHora(h)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {servico && profissional && horario && (
        <section className="etapa" aria-labelledby="etapa-dados">
          <h2 id="etapa-dados" className="etapa-titulo">
            Seus dados
          </h2>
          <form onSubmit={confirmar} className="card form" noValidate>
            {erro && <Alerta tom="perigo">{erro}</Alerta>}
            <Campo id="nome" rotulo="Nome" erro={errosCampos.nome}>
              <input
                {...ariaCampo("nome", { erro: errosCampos.nome })}
                className="input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
              />
            </Campo>
            <Campo
              id="telefone"
              rotulo="Telefone"
              dica="Com DDD. É por ele que a barbearia reconhece você nos próximos agendamentos."
              erro={errosCampos.telefone}
            >
              <input
                {...ariaCampo("telefone", { dica: true, erro: errosCampos.telefone })}
                className="input num"
                type="tel"
                inputMode="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 91234-5678"
                autoComplete="tel"
                required
              />
            </Campo>
            <Botao type="submit" variante="primary" bloco carregando={confirmando} textoCarregando="Confirmando…">
              Confirmar agendamento
            </Botao>
          </form>
        </section>
      )}
    </div>
  );
}
