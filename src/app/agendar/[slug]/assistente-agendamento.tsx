"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, CalendarPlus, CheckCircle2, ChevronRight, Clock, Hourglass, Scissors, User } from "lucide-react";
import { QrPix, formatarContagem } from "@/components/publico/qr-pix";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import { linkArquivoIcs, linkGoogleAgenda } from "@/lib/agenda-celular";
import { EtapaPlano, type AssinanteVM, type PlanoPublicoVM } from "./etapa-plano";
import {
  capitalizar,
  formatarDataInstante,
  formatarDiaCalendario,
  formatarDuracao,
  formatarHora,
  formatarMoeda,
  formatarTelefone,
  apenasDigitos,
} from "@/lib/formatar";
import { Avatar } from "@/components/ui/avatar";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { useFuso } from "@/components/fuso-contexto";

interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  duracaoMinutos: number;
  preco: number;
}

interface Profissional {
  id: string;
  nome: string;
}

interface Props {
  slug: string;
  barbearia: { nome: string; endereco: string | null };
  servicos: Servico[];
  profissionais: Profissional[];
  // Presente quando a barbearia cobra sinal antecipado por Pix.
  sinal: { percentual: number } | null;
  // Planos de corte à venda (vazio: a etapa do plano nem aparece).
  planos: PlanoPublicoVM[];
  assinaturaOnline: boolean;
  whatsappBarbearia: string | null;
  // Personalização da barbearia (Configurações > Página de agendamento).
  recado: string | null;
  mostrarPrecos: boolean;
  diasAFrente: number;
  // Chegou pelo link de um barbeiro: ele já vem escolhido (dá pra trocar).
  profissionalInicialId?: string | null;
}

// Nome e WhatsApp de quem já agendou neste aparelho, pra não digitar de novo.
const CHAVE_CLIENTE = "barbium:cliente";

function lerClienteLembrado(): { nome: string; telefone: string } {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CLIENTE) ?? "null");
    return {
      nome: typeof salvo?.nome === "string" ? salvo.nome : "",
      telefone: typeof salvo?.telefone === "string" ? salvo.telefone : "",
    };
  } catch {
    return { nome: "", telefone: "" };
  }
}

function lembrarCliente(dados: { nome?: string; telefone: string }) {
  try {
    const atual = lerClienteLembrado();
    localStorage.setItem(
      CHAVE_CLIENTE,
      JSON.stringify({ nome: dados.nome?.trim() || atual.nome, telefone: dados.telefone.trim() }),
    );
  } catch {
    // Sem armazenamento (aba anônima, bloqueado): só não lembra.
  }
}

interface PagamentoPix {
  agendamentoId: string;
  valor: number;
  expiraEm: string;
  qrCode: string;
  qrCodeBase64: string | null;
}

const INTERVALO_CONSULTA_MS = 5000;

// Mesmo arredondamento do servidor (centavos), só pra mostrar antes de enviar.
function valorSinal(preco: number, percentual: number): number {
  return Math.round((Math.round(preco * 100) * percentual) / 100) / 100;
}

// Dias de calendário em Brasília (meia-noite UTC que representa o dia) —
// o mesmo formato que a rota de horários espera em `data`.
function chaveDia(dia: Date): string {
  return `${dia.getUTCFullYear()}-${String(dia.getUTCMonth() + 1).padStart(2, "0")}-${String(dia.getUTCDate()).padStart(2, "0")}`;
}

function proximosDias(quantidade: number, fuso: string): Date[] {
  const hoje = inicioDoDiaBrasil(new Date(), fuso);
  return Array.from({ length: quantidade }, (_, i) => new Date(hoje.getTime() + i * 24 * 60 * 60 * 1000));
}

function Passos({ passos, atual }: { passos: string[]; atual: number }) {
  return (
    <ol className="passos" aria-label="Etapas do agendamento" data-muitos={passos.length > 4 || undefined}>
      {passos.map((passo, indice) => (
        <li
          key={passo}
          className="passo"
          data-estado={indice < atual ? "feito" : indice === atual ? "atual" : "pendente"}
          aria-current={indice === atual ? "step" : undefined}
        >
          <span className="passo-rotulo">{passo}</span>
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

export function AssistenteAgendamento({
  slug,
  barbearia,
  servicos,
  profissionais,
  sinal,
  planos,
  assinaturaOnline,
  whatsappBarbearia,
  recado,
  mostrarPrecos,
  diasAFrente,
  profissionalInicialId = null,
}: Props) {
  const fuso = useFuso();
  const temPlanos = planos.length > 0;
  // Um profissional só: ele já vem escolhido e a etapa some.
  const unicoProfissional = profissionais.length === 1 ? profissionais[0] : null;
  const profissionalPadrao = unicoProfissional ?? profissionais.find((p) => p.id === profissionalInicialId) ?? null;
  // Com planos, primeiro o cliente diz como vai agendar.
  const [modo, setModo] = useState<"escolher" | "avulso" | "assinante">(temPlanos ? "escolher" : "avulso");
  const [assinante, setAssinante] = useState<AssinanteVM | null>(null);
  const [servico, setServico] = useState<Servico | null>(null);
  const [profissional, setProfissional] = useState<Profissional | null>(profissionalPadrao);
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
  const [codigo, setCodigo] = useState<string | null>(null);
  const [lembrado, setLembrado] = useState({ nome: "", telefone: "" });
  const [pagamento, setPagamento] = useState<PagamentoPix | null>(null);
  const [sinalPago, setSinalPago] = useState(false);
  const [pixExpirado, setPixExpirado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  // Quem já agendou neste aparelho não digita nome e WhatsApp de novo.
  useEffect(() => {
    const salvo = lerClienteLembrado();
    setLembrado(salvo);
    setNome((atual) => atual || salvo.nome);
    setTelefone((atual) => atual || salvo.telefone);
  }, []);

  // Enquanto o Pix não é pago: relógio da contagem e consulta periódica do
  // status (o servidor confere no Mercado Pago e confirma o agendamento).
  useEffect(() => {
    if (!pagamento || confirmado || pixExpirado) return;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    let ativo = true;

    async function consultar() {
      try {
        const resposta = await fetch(`/api/publico/${slug}/agendamentos/${pagamento!.agendamentoId}`, {
          cache: "no-store",
        });
        if (!resposta.ok || !ativo) return;
        const dados = await resposta.json();
        if (!ativo) return;
        if (dados.status === "CONFIRMADO") {
          setSinalPago(dados.sinalStatus === "PAGO");
          setConfirmado(true);
        } else if (dados.status === "CANCELADO") {
          setPixExpirado(true);
        }
      } catch {
        // Sem conexão agora: tenta de novo na próxima rodada.
      }
    }

    const consulta = setInterval(consultar, INTERVALO_CONSULTA_MS);
    return () => {
      ativo = false;
      clearInterval(relogio);
      clearInterval(consulta);
    };
  }, [pagamento, confirmado, pixExpirado, slug]);

  const dias = proximosDias(diasAFrente, fuso);
  const passos = [
    ...(temPlanos ? ["Plano"] : []),
    "Serviço",
    ...(unicoProfissional ? [] : ["Profissional"]),
    "Horário",
    "Seus dados",
  ];
  const etapa =
    modo === "escolher"
      ? "Plano"
      : !servico
        ? "Serviço"
        : !profissional
          ? "Profissional"
          : !horario
            ? "Horário"
            : "Seus dados";
  const passoAtual = passos.indexOf(etapa);
  const peloPlano = modo === "assinante" && assinante !== null;
  // Assinante só vê os serviços do plano.
  const servicosVisiveis = peloPlano ? servicos.filter((s) => assinante.plano.servicoIds.includes(s.id)) : servicos;

  function trocarServico() {
    setServico(null);
    setProfissional(profissionalPadrao);
    trocarHorario();
  }

  function trocarProfissional() {
    setProfissional(null);
    trocarHorario();
  }

  function trocarModo() {
    trocarServico();
    setAssinante(null);
    setModo("escolher");
  }

  function trocarHorario() {
    setDia(null);
    setHorario(null);
    setHorariosDisponiveis([]);
    setErro(null);
  }

  function recomecar() {
    trocarServico();
    setModo(temPlanos ? "escolher" : "avulso");
    setAssinante(null);
    const salvo = lerClienteLembrado();
    setLembrado(salvo);
    setNome(salvo.nome);
    setTelefone(salvo.telefone);
    setErrosCampos({});
    setCodigo(null);
    setConfirmado(false);
    setConfirmando(false);
    setPagamento(null);
    setSinalPago(false);
    setPixExpirado(false);
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

    const telefoneEnvio = peloPlano ? assinante.telefone : telefone;
    const validacao: { nome?: string; telefone?: string } = {};
    if (!peloPlano && nome.trim().length < 2) validacao.nome = "Informe seu nome.";
    if (apenasDigitos(telefoneEnvio).length < 8) validacao.telefone = "Informe um telefone válido, com DDD.";
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
          telefone: telefoneEnvio,
          ...(peloPlano ? { usarPlano: true } : { nome }),
        }),
      });
      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível confirmar o agendamento.");
        setConfirmando(false);
        return;
      }

      lembrarCliente({ telefone: telefoneEnvio, ...(peloPlano ? {} : { nome }) });
      setCodigo(dados?.codigo ?? null);
      if (dados?.pagamento) {
        setAgora(Date.now());
        setPagamento({ agendamentoId: dados.agendamento.id, ...dados.pagamento });
        return;
      }
      setConfirmado(true);
    } catch {
      setErro("Falha de conexão. Seus dados continuam aqui — tente novamente.");
      setConfirmando(false);
    }
  }

  if (confirmado && servico && profissional && horario) {
    const evento = {
      id: codigo?.split(".")[0] ?? horario.toISOString(),
      titulo: `${servico.nome} · ${barbearia.nome}`,
      inicio: horario,
      fim: new Date(horario.getTime() + servico.duracaoMinutos * 60 * 1000),
      local: barbearia.endereco,
      descricao: [
        `Com ${profissional.nome}.`,
        codigo && typeof window !== "undefined" ? `Ver, remarcar ou cancelar: ${window.location.origin}/meu-horario/${codigo}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    };
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
            <dd>{capitalizar(formatarDataInstante(horario, { weekday: "long", day: "2-digit", month: "long" }, fuso))}</dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>{formatarHora(horario, fuso)}</dd>
          </div>
          {peloPlano && (
            <div>
              <dt>Pagamento</dt>
              <dd>Incluído no seu plano</dd>
            </div>
          )}
          {pagamento && sinalPago && (
            <>
              <div>
                <dt>Sinal pago</dt>
                <dd>{formatarMoeda(pagamento.valor)}</dd>
              </div>
              <div>
                <dt>Restante no atendimento</dt>
                <dd>{formatarMoeda(Math.max(0, servico.preco - pagamento.valor))}</dd>
              </div>
            </>
          )}
        </dl>
        <div className="confirmacao-acoes">
          <a href={linkArquivoIcs(evento)} download="agendamento.ics" className="btn btn-primary btn-bloco">
            <CalendarPlus size={18} aria-hidden="true" />
            Adicionar à agenda do celular
          </a>
          <a href={linkGoogleAgenda(evento)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            Prefere o Google Agenda? Adicionar por lá
          </a>
          {codigo && (
            <Link href={`/meu-horario/${codigo}`} className="btn btn-secondary btn-bloco">
              Ver, remarcar ou cancelar
            </Link>
          )}
          <Botao onClick={recomecar} bloco>
            Fazer outro agendamento
          </Botao>
        </div>
        {codigo && (
          <p className="texto-pequeno texto-secundario">
            Guarde o link de remarcar: ele vale até 2 horas antes do horário.
          </p>
        )}
      </section>
    );
  }

  if (pixExpirado) {
    return (
      <section className="card confirmacao" aria-live="polite">
        <span className="confirmacao-icone" data-tom="atencao" aria-hidden="true">
          <Hourglass size={26} />
        </span>
        <h2 className="etapa-titulo">O prazo para pagar acabou</h2>
        <p className="texto-secundario">
          O horário foi liberado. Se você chegou a pagar o Pix, fale com a barbearia antes de agendar de novo.
        </p>
        <Botao variante="primary" onClick={recomecar}>
          Agendar de novo
        </Botao>
      </section>
    );
  }

  if (pagamento && servico && horario) {
    const restanteMs = Date.parse(pagamento.expiraEm) - agora;
    return (
      <section className="card confirmacao" aria-labelledby="titulo-pix">
        <h2 id="titulo-pix" className="etapa-titulo">
          Pague o sinal para confirmar
        </h2>
        <p className="texto-secundario">
          {servico.nome} · {capitalizar(formatarDataInstante(horario, { weekday: "short", day: "2-digit", month: "2-digit" }, fuso))}{" "}
          às {formatarHora(horario, fuso)}
        </p>
        <p className="num valor-destaque">
          {formatarMoeda(pagamento.valor)}
        </p>
        <QrPix qrCode={pagamento.qrCode} qrCodeBase64={pagamento.qrCodeBase64} alt="QR code do Pix do sinal" />
        <p className="pix-espera">
          <span className="spinner" aria-hidden="true" />
          <span role="status">{restanteMs > 0 ? "Aguardando pagamento" : "Conferindo o pagamento…"}</span>
          {restanteMs > 0 && <span className="num">· horário reservado por {formatarContagem(restanteMs)}</span>}
        </p>
        <p className="texto-pequeno texto-secundario">
          O restante, {formatarMoeda(Math.max(0, servico.preco - pagamento.valor))}, é pago no atendimento.
        </p>
      </section>
    );
  }

  return (
    <div className="pilha">
      {recado && <p className="publico-recado">{recado}</p>}
      <Passos passos={passos} atual={passoAtual} />

      {modo === "escolher" && (
        <EtapaPlano
          slug={slug}
          planos={planos}
          assinaturaOnline={assinaturaOnline}
          whatsappBarbearia={whatsappBarbearia}
          telefoneInicial={lembrado.telefone}
          nomeInicial={lembrado.nome}
          onAvulso={() => setModo("avulso")}
          onAssinante={(dados) => {
            setAssinante(dados);
            setModo("assinante");
          }}
          onLembrar={lembrarCliente}
        />
      )}

      {temPlanos && modo !== "escolher" && (
        <Escolha
          icone={peloPlano ? <BadgeCheck size={20} /> : <Scissors size={20} />}
          rotulo="Plano"
          valor={peloPlano ? assinante.plano.nome : "Sem plano"}
          onTrocar={trocarModo}
        />
      )}

      {servico && (
        <Escolha
          icone={<Scissors size={20} />}
          rotulo="Serviço"
          valor={
            peloPlano ? `${servico.nome} · incluído no plano` : mostrarPrecos ? `${servico.nome} · ${formatarMoeda(servico.preco)}` : servico.nome
          }
          onTrocar={trocarServico}
        />
      )}
      {profissional && !unicoProfissional && (
        <Escolha icone={<User size={20} />} rotulo="Profissional" valor={profissional.nome} onTrocar={trocarProfissional} />
      )}
      {horario && dia && (
        <Escolha
          icone={<CalendarCheck size={20} />}
          rotulo="Data e horário"
          valor={`${capitalizar(formatarDiaCalendario(dia, { weekday: "short", day: "2-digit", month: "2-digit" }))} às ${formatarHora(horario, fuso)}`}
          onTrocar={trocarHorario}
        />
      )}

      {modo !== "escolher" && !servico && (
        <section className="etapa" aria-labelledby="etapa-servico">
          <h2 id="etapa-servico" className="etapa-titulo">
            Escolha o serviço
          </h2>
          {peloPlano && assinante.usosRestantes !== null && (
            <p className="texto-secundario texto-pequeno">
              {assinante.usosRestantes === 1
                ? "Resta 1 atendimento do plano neste mês."
                : `Restam ${assinante.usosRestantes} atendimentos do plano neste mês.`}
            </p>
          )}
          <div className="opcoes">
            {servicosVisiveis.map((s) => (
              <button key={s.id} type="button" onClick={() => setServico(s)} className="opcao">
                <span className="opcao-texto">
                  <span className="opcao-titulo">{s.nome}</span>
                  {s.descricao && <span className="opcao-descricao">{s.descricao}</span>}
                  <span className="opcao-sub">
                    <Clock size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                    {formatarDuracao(s.duracaoMinutos)}
                  </span>
                </span>
                {peloPlano ? (
                  <span className="badge" data-tom="sucesso">
                    Incluído no plano
                  </span>
                ) : mostrarPrecos ? (
                  <span className="opcao-valor">{formatarMoeda(s.preco)}</span>
                ) : null}
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
                      {formatarHora(h, fuso)}
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
            {peloPlano ? (
              <p>
                Pelo seu plano, sem pagar nada agora. WhatsApp do plano:{" "}
                <span className="num">{formatarTelefone(assinante.telefone)}</span>.
              </p>
            ) : (
            <>
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
            </>
            )}
            {sinal && !peloPlano && (
              <Alerta tom="info">
                Para garantir o horário, pague agora um sinal de{" "}
                <strong>{formatarMoeda(valorSinal(servico.preco, sinal.percentual))}</strong> ({sinal.percentual}%) por
                Pix. O restante é pago no atendimento.
              </Alerta>
            )}
            <Botao
              type="submit"
              variante="primary"
              bloco
              carregando={confirmando}
              textoCarregando={sinal && !peloPlano ? "Gerando Pix…" : "Confirmando…"}
            >
              {sinal && !peloPlano ? "Continuar para o Pix" : "Confirmar agendamento"}
            </Botao>
          </form>
        </section>
      )}
    </div>
  );
}
