"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StatusAgendamento } from "@prisma/client";
import { AlertCircle, Check, ChevronRight, Clock, MessageCircle, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, ICONE_STATUS, StatusBadge } from "@/components/ui/badge";
import { Botao } from "@/components/ui/botao";
import { Dialogo } from "@/components/ui/dialogo";
import { Alerta } from "@/components/ui/alerta";
import {
  capitalizar,
  formatarDataInstante,
  formatarDuracao,
  formatarHora,
  formatarMoeda,
  formatarTelefone,
  linkWhatsApp,
} from "@/lib/formatar";
import { ROTULO_STATUS } from "@/lib/status-agendamento";
import type { AgendamentoVM, GradeVM, GrupoAgendaVM, ServicoOpcaoVM } from "./tipos";

// ---------------------------------------------------------------------------
// Mudança de status e troca de serviço — mesma rota PATCH; a API aplica as
// regras (barbeiro só altera os próprios, concluir lança no caixa, reabrir
// desfaz, troca confere conflito de horário e corrige o caixa).
// ---------------------------------------------------------------------------

function useAtualizarAgendamento() {
  const router = useRouter();
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Fica true até a agenda recarregar com os dados novos do servidor.
  const [atualizando, iniciarAtualizacao] = useTransition();

  const enviar = useCallback(
    async (id: string, corpo: { status: StatusAgendamento } | { servicoId: string }): Promise<boolean> => {
      setProcessandoId(id);
      setErro(null);
      try {
        const resposta = await fetch(`/api/painel/agendamentos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });
        if (!resposta.ok) {
          const dados = await resposta.json().catch(() => null);
          setErro(dados?.erro ?? "Não foi possível atualizar o agendamento.");
          return false;
        }
        iniciarAtualizacao(() => router.refresh());
        return true;
      } catch {
        setErro("Falha de conexão. Tente novamente.");
        return false;
      } finally {
        setProcessandoId(null);
      }
    },
    [router],
  );

  const alterar = useCallback((id: string, status: StatusAgendamento) => enviar(id, { status }), [enviar]);
  const trocarServico = useCallback((id: string, servicoId: string) => enviar(id, { servicoId }), [enviar]);
  const limparErro = useCallback(() => setErro(null), []);

  return { alterar, trocarServico, processandoId, atualizando, erro, limparErro };
}

function descreverSinal(ag: AgendamentoVM): string {
  if (!ag.sinal) return "";
  if (ag.sinal.status === "PAGO") return "pago";
  if (ag.sinal.status === "PENDENTE") return ag.status === "CANCELADO" ? "não pago no prazo" : "aguardando Pix";
  return "dispensado";
}

function estaAcontecendo(ag: AgendamentoVM, agoraMs: number): boolean {
  return ag.status === "CONFIRMADO" && Date.parse(ag.inicio) <= agoraMs && agoraMs < Date.parse(ag.fim);
}

// Concluir aparece direto no cartão só quando o horário já começou —
// antes disso a ação fica no painel de detalhes.
function podeConcluirRapido(ag: AgendamentoVM, agoraMs: number): boolean {
  return ag.status === "CONFIRMADO" && Date.parse(ag.inicio) <= agoraMs;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function AgendaInterativa({
  grupos,
  servicos,
  agora,
  mostrarProfissional,
  grade,
  vazio,
  emCard,
}: {
  grupos: GrupoAgendaVM[];
  // Serviços ativos da barbearia, oferecidos na troca de serviço.
  servicos: ServicoOpcaoVM[];
  agora: string;
  mostrarProfissional: boolean;
  grade?: GradeVM | null;
  vazio?: ReactNode;
  // Dentro de um card (visão geral): lista sem moldura própria e grade sem
  // card próprio, pra não aninhar cards.
  emCard?: boolean;
}) {
  const agoraMs = Date.parse(agora);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const { alterar, trocarServico, processandoId, atualizando, erro, limparErro } = useAtualizarAgendamento();

  const todos = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);
  const selecionado = todos.find((ag) => ag.id === selecionadoId) ?? null;

  const abrir = useCallback(
    (id: string) => {
      limparErro();
      setSelecionadoId(id);
    },
    [limparErro],
  );

  if (todos.length === 0) return <>{vazio}</>;

  const lista = (
    <div className={`agenda-lista${emCard ? " agenda-lista-plana" : ""}`}>
      {grupos.map((grupo) =>
        grupo.itens.length === 0 ? null : (
          <section key={grupo.chave} className="agenda-grupo" aria-label={grupo.rotulo || undefined}>
            {grupo.rotulo && <h2 className="agenda-grupo-titulo">{grupo.rotulo}</h2>}
            {grupo.itens.map((ag) => (
              <LinhaAgenda
                key={ag.id}
                ag={ag}
                agoraMs={agoraMs}
                mostrarProfissional={mostrarProfissional}
                aoAbrir={abrir}
                aoConcluir={() => alterar(ag.id, "CONCLUIDO")}
                concluindo={processandoId === ag.id}
              />
            ))}
          </section>
        ),
      )}
    </div>
  );

  return (
    <>
      {erro && !selecionado && (
        <div style={{ marginBottom: 16 }}>
          <Alerta tom="perigo">{erro}</Alerta>
        </div>
      )}

      {grade ? (
        <>
          <div className="so-mobile">{lista}</div>
          <div className={emCard ? "so-desktop" : "so-desktop card card-sem-padding"}>
            <GradeProfissionais grade={grade} itens={todos} agoraMs={agoraMs} aoAbrir={abrir} />
          </div>
        </>
      ) : (
        lista
      )}

      <PainelAgendamento
        ag={selecionado}
        servicos={servicos}
        agoraMs={agoraMs}
        aoFechar={() => setSelecionadoId(null)}
        alterar={alterar}
        trocarServico={trocarServico}
        processando={selecionado !== null && (processandoId === selecionado.id || atualizando)}
        atualizando={atualizando}
        erro={erro}
        limparErro={limparErro}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Lista cronológica
// ---------------------------------------------------------------------------

function LinhaAgenda({
  ag,
  agoraMs,
  mostrarProfissional,
  aoAbrir,
  aoConcluir,
  concluindo,
}: {
  ag: AgendamentoVM;
  agoraMs: number;
  mostrarProfissional: boolean;
  aoAbrir: (id: string) => void;
  aoConcluir: () => void;
  concluindo: boolean;
}) {
  const agoraAcontecendo = estaAcontecendo(ag, agoraMs);
  const inicio = new Date(ag.inicio);

  return (
    <div className="agenda-linha" data-agora={agoraAcontecendo || undefined}>
      <time className="agenda-hora" dateTime={ag.inicio}>
        {formatarHora(inicio)}
      </time>
      <span className="agenda-trilho" aria-hidden="true" />
      <article className="agendamento-card" data-agora={agoraAcontecendo || undefined} data-status={ag.status}>
        <Avatar nome={ag.cliente.nome} tamanho={44} />
        <div className="agendamento-corpo">
          <div className="agendamento-topo">
            <h3 className="agendamento-cliente">
              <button type="button" className="agendamento-abrir" onClick={() => aoAbrir(ag.id)}>
                {ag.cliente.nome}
                <span className="sr-only">
                  , {formatarHora(inicio)}, {ag.servico.nome} — ver detalhes
                </span>
              </button>
            </h3>
            <div className="agendamento-lateral">
              {agoraAcontecendo ? (
                <Badge tom="sucesso" icone={<Clock size={13} strokeWidth={2.2} aria-hidden="true" />}>
                  Agora
                </Badge>
              ) : (
                <StatusBadge status={ag.status} />
              )}
            </div>
          </div>
          <p className="agendamento-servico">{ag.servico.nome}</p>
          <div className="agendamento-meta">
            {mostrarProfissional && (
              <span>
                <User size={14} aria-hidden="true" />
                {ag.profissional.nome}
              </span>
            )}
            <span>
              <Clock size={14} aria-hidden="true" />
              {formatarDuracao(ag.servico.duracaoMinutos)}
            </span>
          </div>
          {podeConcluirRapido(ag, agoraMs) && (
            <div className="agendamento-acao-rapida">
              <Botao
                variante="primary"
                pequeno
                icone={<Check size={16} aria-hidden="true" />}
                onClick={aoConcluir}
                carregando={concluindo}
                textoCarregando="Concluindo…"
              >
                Concluir atendimento
              </Botao>
            </div>
          )}
        </div>
        <ChevronRight size={18} className="agendamento-chevron" aria-hidden="true" />
      </article>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grade por profissional (desktop)
// ---------------------------------------------------------------------------

const PX_POR_MINUTO = 2;

function GradeProfissionais({
  grade,
  itens,
  agoraMs,
  aoAbrir,
}: {
  grade: GradeVM;
  itens: AgendamentoVM[];
  agoraMs: number;
  aoAbrir: (id: string) => void;
}) {
  const inicioDiaMs = Date.parse(grade.inicioDia);
  const minutosDoDia = (iso: string) => (Date.parse(iso) - inicioDiaMs) / 60000;

  // Janela visível: da primeira hora com atendimento à última, com folga
  // mínima de 4 horas pra grade não ficar espremida.
  const inicios = itens.map((ag) => minutosDoDia(ag.inicio));
  const fins = itens.map((ag) => minutosDoDia(ag.fim));
  let inicioJanela = Math.max(0, Math.floor(Math.min(...inicios) / 60) * 60);
  let fimJanela = Math.min(1440, Math.ceil(Math.max(...fins) / 60) * 60);
  if (fimJanela - inicioJanela < 240) fimJanela = Math.min(1440, inicioJanela + 240);
  if (fimJanela - inicioJanela < 240) inicioJanela = Math.max(0, fimJanela - 240);

  const altura = (fimJanela - inicioJanela) * PX_POR_MINUTO;
  const slots: number[] = [];
  for (let m = inicioJanela; m <= fimJanela; m += 30) slots.push(m);

  const minutoAgora = (agoraMs - inicioDiaMs) / 60000;
  const mostrarAgora = minutoAgora >= inicioJanela && minutoAgora <= fimJanela;

  const rotuloSlot = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  return (
    <div className="grade-agenda-wrap">
      <div className="grade-agenda" style={{ "--colunas": grade.profissionais.length } as CSSProperties}>
        <div className="grade-agenda-canto" />
        {grade.profissionais.map((p) => (
          <div key={p.id} className="grade-agenda-cabecalho">
            <Avatar nome={p.nome} tamanho={26} />
            {p.nome}
          </div>
        ))}

        <div className="grade-agenda-horas" style={{ height: altura }} aria-hidden="true">
          {slots
            .filter((m) => m % 60 === 0 && m > inicioJanela && m < fimJanela)
            .map((m) => (
              <span key={m} className="grade-agenda-hora num" style={{ top: (m - inicioJanela) * PX_POR_MINUTO }}>
                {rotuloSlot(m)}
              </span>
            ))}
        </div>

        {grade.profissionais.map((p) => (
          <div
            key={p.id}
            className="grade-agenda-coluna"
            style={{ height: altura }}
            role="list"
            aria-label={`Agenda de ${p.nome}`}
          >
            {slots.slice(1, -1).map((m) => (
              <span
                key={m}
                className="grade-agenda-slot"
                data-meia={m % 60 !== 0 || undefined}
                style={{ top: (m - inicioJanela) * PX_POR_MINUTO }}
                aria-hidden="true"
              />
            ))}
            {mostrarAgora && (
              <span
                className="grade-agenda-agora"
                style={{ top: (minutoAgora - inicioJanela) * PX_POR_MINUTO }}
                aria-hidden="true"
              />
            )}
            {itens
              .filter((ag) => ag.profissional.id === p.id)
              .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
              .map((ag, indice, daColuna) => {
                const top = (minutosDoDia(ag.inicio) - inicioJanela) * PX_POR_MINUTO;
                // Altura mínima pra caber horário e cliente, mas nunca invadindo
                // o próximo atendimento da mesma coluna (serviços curtos).
                const proximo = daColuna[indice + 1];
                const espacoAteProximo = proximo
                  ? (minutosDoDia(proximo.inicio) - inicioJanela) * PX_POR_MINUTO - top - 4
                  : Infinity;
                const alturaBloco = Math.max(
                  Math.min(
                    Math.max((minutosDoDia(ag.fim) - minutosDoDia(ag.inicio)) * PX_POR_MINUTO - 4, 40),
                    espacoAteProximo,
                  ),
                  24,
                );
                const inicio = new Date(ag.inicio);
                const fim = new Date(ag.fim);
                const agoraAcontecendo = estaAcontecendo(ag, agoraMs);
                const IconeStatus = agoraAcontecendo ? Clock : ICONE_STATUS[ag.status];
                return (
                  <div key={ag.id} role="listitem">
                    <button
                      type="button"
                      className="grade-bloco"
                      data-status={ag.status}
                      data-agora={agoraAcontecendo || undefined}
                      style={{ top: top + 2, height: alturaBloco }}
                      onClick={() => aoAbrir(ag.id)}
                    >
                      <span className="grade-bloco-linha">
                        <span className="grade-bloco-horario">
                          {formatarHora(inicio)} – {formatarHora(fim)}
                        </span>
                        <span className="grade-bloco-status">
                          <IconeStatus size={12} strokeWidth={2.4} aria-hidden="true" />
                          {agoraAcontecendo ? "Agora" : ROTULO_STATUS[ag.status]}
                        </span>
                      </span>
                      <span className="grade-bloco-cliente">{ag.cliente.nome}</span>
                      {alturaBloco > 64 && <span className="grade-bloco-servico">{ag.servico.nome}</span>}
                    </button>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel de detalhes + transições de status + troca de serviço
// ---------------------------------------------------------------------------

type Confirmacao = "cancelar" | "reabrir" | "trocar" | null;

function PainelAgendamento({
  ag,
  servicos,
  agoraMs,
  aoFechar,
  alterar,
  trocarServico,
  processando,
  atualizando,
  erro,
  limparErro,
}: {
  ag: AgendamentoVM | null;
  servicos: ServicoOpcaoVM[];
  agoraMs: number;
  aoFechar: () => void;
  alterar: (id: string, status: StatusAgendamento) => Promise<boolean>;
  trocarServico: (id: string, servicoId: string) => Promise<boolean>;
  processando: boolean;
  atualizando: boolean;
  erro: string | null;
  limparErro: () => void;
}) {
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [novoServicoId, setNovoServicoId] = useState("");
  // Nome do serviço já salvo, enquanto a agenda recarrega.
  const [trocaSalva, setTrocaSalva] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const botaoTrocarRef = useRef<HTMLButtonElement>(null);
  const idSelect = useId();

  // Só sai do modo de troca quando os dados novos chegaram, pra confirmação
  // não aparecer ao lado do serviço e do horário antigos.
  useEffect(() => {
    if (trocaSalva === null || atualizando) return;
    setConfirmacao(null);
    setAviso(`Serviço trocado para ${trocaSalva}.`);
    setTrocaSalva(null);
    requestAnimationFrame(() => botaoTrocarRef.current?.focus());
  }, [trocaSalva, atualizando]);

  function fechar() {
    setConfirmacao(null);
    setAviso(null);
    setTrocaSalva(null);
    aoFechar();
  }

  async function executar(status: StatusAgendamento) {
    if (!ag) return;
    setAviso(null);
    const ok = await alterar(ag.id, status);
    if (ok) fechar();
  }

  function iniciarTroca() {
    if (!ag) return;
    limparErro();
    setAviso(null);
    setNovoServicoId(ag.servico.id);
    setConfirmacao("trocar");
  }

  function cancelarTroca() {
    limparErro();
    setConfirmacao(null);
    requestAnimationFrame(() => botaoTrocarRef.current?.focus());
  }

  async function salvarTroca() {
    if (!ag || novoServicoId === ag.servico.id) return;
    const escolhido = servicos.find((s) => s.id === novoServicoId);
    if (!escolhido) return;
    const ok = await trocarServico(ag.id, escolhido.id);
    if (ok) setTrocaSalva(escolhido.nome);
  }

  if (!ag) return <Dialogo aberto={false} aoFechar={fechar} titulo="" />;

  const inicio = new Date(ag.inicio);
  const fim = new Date(ag.fim);
  const whatsapp = linkWhatsApp(ag.cliente.telefone);
  const agoraAcontecendo = estaAcontecendo(ag, agoraMs);
  const concluido = ag.status === "CONCLUIDO";

  const podeTrocar =
    (ag.status === "CONFIRMADO" || concluido) && servicos.some((s) => s.id !== ag.servico.id);
  // O serviço atual pode ter sido desativado depois do agendamento; continua
  // na lista só pra marcar de onde se está saindo.
  const opcoesServico = servicos.some((s) => s.id === ag.servico.id) ? servicos : [ag.servico, ...servicos];
  const escolhido = opcoesServico.find((s) => s.id === novoServicoId) ?? ag.servico;
  const mudouServico = escolhido.id !== ag.servico.id;
  const novoFim = new Date(inicio.getTime() + escolhido.duracaoMinutos * 60 * 1000);

  let rodape: ReactNode;
  if (confirmacao === "trocar") {
    rodape = (
      <>
        <Botao onClick={cancelarTroca} disabled={processando}>
          Voltar
        </Botao>
        <Botao
          variante="primary"
          onClick={salvarTroca}
          disabled={!mudouServico}
          carregando={processando}
          textoCarregando="Salvando…"
        >
          Salvar troca
        </Botao>
      </>
    );
  } else if (confirmacao === "cancelar") {
    rodape = (
      <>
        <p className="texto-pequeno" style={{ flexBasis: "100%" }}>
          Cancelar este agendamento? O horário volta a ficar livre para novos agendamentos.
          {ag.status === "AGUARDANDO_PAGAMENTO" && " O Pix do sinal deixa de valer."}
          {ag.sinal?.status === "PAGO" &&
            ` O sinal de ${formatarMoeda(ag.sinal.valor)} não é devolvido automaticamente.`}
        </p>
        <Botao onClick={() => setConfirmacao(null)} disabled={processando}>
          Voltar
        </Botao>
        <Botao
          variante="danger"
          onClick={() => executar("CANCELADO")}
          carregando={processando}
          textoCarregando="Cancelando…"
        >
          Cancelar agendamento
        </Botao>
      </>
    );
  } else if (confirmacao === "reabrir") {
    rodape = (
      <>
        <p className="texto-pequeno" style={{ flexBasis: "100%" }}>
          Reabrir remove do caixa o lançamento de {formatarMoeda(ag.servico.preco)} gerado na conclusão.
        </p>
        <Botao onClick={() => setConfirmacao(null)} disabled={processando}>
          Voltar
        </Botao>
        <Botao
          variante="primary"
          onClick={() => executar("CONFIRMADO")}
          carregando={processando}
          textoCarregando="Reabrindo…"
        >
          Reabrir agendamento
        </Botao>
      </>
    );
  } else if (ag.status === "AGUARDANDO_PAGAMENTO") {
    rodape = (
      <>
        <Botao variante="danger-outline" onClick={() => setConfirmacao("cancelar")} disabled={processando}>
          Cancelar
        </Botao>
        <Botao
          onClick={() => executar("CONFIRMADO")}
          carregando={processando}
          textoCarregando="Confirmando…"
        >
          Confirmar sem sinal
        </Botao>
      </>
    );
  } else if (ag.status === "CONFIRMADO") {
    rodape = (
      <>
        <Botao variante="danger-outline" onClick={() => setConfirmacao("cancelar")} disabled={processando}>
          Cancelar
        </Botao>
        <Botao onClick={() => executar("FALTA")} disabled={processando}>
          Marcar falta
        </Botao>
        <Botao
          variante="primary"
          icone={<Check size={18} aria-hidden="true" />}
          onClick={() => executar("CONCLUIDO")}
          carregando={processando}
          textoCarregando="Salvando…"
        >
          Concluir
        </Botao>
      </>
    );
  } else {
    rodape = (
      <Botao
        onClick={() => (ag.status === "CONCLUIDO" ? setConfirmacao("reabrir") : executar("CONFIRMADO"))}
        carregando={processando}
        textoCarregando="Reabrindo…"
      >
        Reabrir agendamento
      </Botao>
    );
  }

  return (
    <Dialogo
      aberto
      lateral
      aoFechar={fechar}
      bloquearFechamento={processando}
      titulo={ag.cliente.nome}
      descricao={
        <span style={{ display: "inline-flex", gap: 8, marginTop: 4 }}>
          {agoraAcontecendo && (
            <Badge tom="sucesso" icone={<Clock size={13} strokeWidth={2.2} aria-hidden="true" />}>
              Agora
            </Badge>
          )}
          <StatusBadge status={ag.status} />
        </span>
      }
      rodape={rodape}
    >
      <div className="pilha-sm">
        {erro && confirmacao !== "trocar" && <Alerta tom="perigo">{erro}</Alerta>}
        {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}
        {ag.status === "AGUARDANDO_PAGAMENTO" && ag.sinal?.expiraEm && (
          <Alerta tom="atencao">
            O cliente ainda não pagou o Pix do sinal. O horário fica reservado até{" "}
            {formatarHora(new Date(ag.sinal.expiraEm))} e depois volta a ficar livre.
          </Alerta>
        )}
        {ag.status === "CANCELADO" && ag.sinal?.status === "PAGO" && (
          <Alerta tom="atencao">
            O cliente pagou um sinal de {formatarMoeda(ag.sinal.valor)}. Se for devolver, faça o reembolso pelo
            Mercado Pago.
          </Alerta>
        )}
        <dl className="fatos">
          <div>
            <dt>Data</dt>
            <dd>{capitalizar(formatarDataInstante(inicio, { weekday: "long", day: "2-digit", month: "long" }))}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>
              {formatarHora(inicio)} – {formatarHora(fim)}
            </dd>
          </div>
          {confirmacao === "trocar" ? (
            <div className="fatos-edicao">
              <dt>
                <label htmlFor={idSelect}>Serviço</label>
              </dt>
              <dd>
                <select
                  id={idSelect}
                  className="input"
                  value={novoServicoId}
                  onChange={(e) => {
                    setNovoServicoId(e.target.value);
                    limparErro();
                  }}
                  disabled={processando}
                  aria-describedby={`${idSelect}-previa${erro ? ` ${idSelect}-erro` : ""}`}
                  aria-invalid={erro ? true : undefined}
                  autoFocus
                >
                  {opcoesServico.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} · {formatarDuracao(s.duracaoMinutos)} · {formatarMoeda(s.preco)}
                      {s.id === ag.servico.id ? " (atual)" : ""}
                    </option>
                  ))}
                </select>
                <div id={`${idSelect}-previa`} className="campo-dica">
                  {mudouServico ? (
                    <>
                      <p>
                        Novo horário: {formatarHora(inicio)} – {formatarHora(novoFim)} · {formatarMoeda(escolhido.preco)}
                      </p>
                      {concluido && (
                        <p>
                          {escolhido.preco === ag.servico.preco
                            ? `O valor no caixa continua ${formatarMoeda(escolhido.preco)}.`
                            : `O lançamento no caixa passa de ${formatarMoeda(ag.servico.preco)} para ${formatarMoeda(escolhido.preco)}.`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p>{concluido ? "Escolha o serviço que o cliente fez." : "Escolha o serviço que o cliente vai fazer."}</p>
                  )}
                </div>
                {erro && (
                  <p id={`${idSelect}-erro`} className="campo-erro" role="alert">
                    <AlertCircle size={14} aria-hidden="true" />
                    {erro}
                  </p>
                )}
              </dd>
            </div>
          ) : (
            <div>
              <dt>Serviço</dt>
              <dd className="fatos-valor-acao">
                <span>{ag.servico.nome}</span>
                {podeTrocar && confirmacao === null && (
                  <button
                    ref={botaoTrocarRef}
                    type="button"
                    className="btn btn-secondary btn-sm fatos-acao"
                    onClick={iniciarTroca}
                    disabled={processando}
                    aria-label={`Trocar serviço (atual: ${ag.servico.nome})`}
                  >
                    Trocar
                  </button>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt>Duração</dt>
            <dd>{formatarDuracao(ag.servico.duracaoMinutos)}</dd>
          </div>
          <div>
            <dt>Valor</dt>
            <dd>{formatarMoeda(ag.servico.preco)}</dd>
          </div>
          {ag.sinal && (
            <div>
              <dt>Sinal</dt>
              <dd>
                {formatarMoeda(ag.sinal.valor)} · {descreverSinal(ag)}
              </dd>
            </div>
          )}
          {ag.sinal?.status === "PAGO" && ag.status !== "CANCELADO" && (
            <div>
              <dt>Restante no atendimento</dt>
              <dd>{formatarMoeda(Math.max(0, ag.servico.preco - ag.sinal.valor))}</dd>
            </div>
          )}
          <div>
            <dt>Profissional</dt>
            <dd>{ag.profissional.nome}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{formatarTelefone(ag.cliente.telefone)}</dd>
          </div>
        </dl>
        <div className="form-acoes">
          <Link href={`/painel/clientes/${ag.cliente.id}`} className="btn btn-secondary btn-sm">
            Ver ficha do cliente
          </Link>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <MessageCircle size={16} aria-hidden="true" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </Dialogo>
  );
}
