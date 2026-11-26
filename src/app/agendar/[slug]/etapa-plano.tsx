"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarPlus, ChevronLeft, ChevronRight, MessageCircle, Repeat, Scissors } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { PixDoPlano, type PixPlanoVM } from "@/components/publico/pix-do-plano";
import { useFuso } from "@/components/fuso-contexto";
import { apenasDigitos, formatarDataInstante, formatarMoeda } from "@/lib/formatar";
import { descreverUsos, mesDoPlano } from "@/lib/planos-corte-regras";

export interface PlanoPublicoVM {
  id: string;
  nome: string;
  valor: number;
  usosPorMes: number | null;
  servicos: { id: string; nome: string }[];
}

// Assinante com plano valendo, pronto pra escolher o serviço.
export interface AssinanteVM {
  telefone: string;
  plano: { id: string; nome: string; servicoIds: string[] };
  validaAte: string;
  usosRestantes: number | null;
}

interface RespostaAssinante {
  situacao: "ATIVA" | "VENCIDA" | "AGUARDANDO_PAGAMENTO" | "CANCELADA" | "NENHUMA";
  plano?: { id: string; nome: string; valor: number; usosPorMes: number | null; servicoIds: string[]; ativo: boolean };
  validaAte?: string | null;
  usosRestantes?: number | null;
}

interface PixPlano extends PixPlanoVM {
  planoNome: string;
}

type Tela = "inicio" | "consultar" | "planos" | "assinar" | "pix" | "ativo";

const INTERVALO_CONSULTA_MS = 5000;

function Voltar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm etapa-voltar" onClick={onClick}>
      <ChevronLeft size={16} aria-hidden="true" />
      Voltar
    </button>
  );
}

export function EtapaPlano({
  slug,
  planos,
  pixOnline,
  cartaoOnline,
  whatsappBarbearia,
  telefoneInicial,
  nomeInicial,
  onAvulso,
  onAssinante,
  onLembrar,
}: {
  slug: string;
  planos: PlanoPublicoVM[];
  // A barbearia recebe Pix online (Mercado Pago ou a chave dela): dá pra
  // assinar e renovar aqui. Cartão com renovação automática: só Mercado Pago.
  pixOnline: boolean;
  cartaoOnline: boolean;
  whatsappBarbearia: string | null;
  telefoneInicial: string;
  nomeInicial: string;
  onAvulso: () => void;
  onAssinante: (assinante: AssinanteVM) => void;
  onLembrar: (dados: { nome?: string; telefone: string }) => void;
}) {
  const fuso = useFuso();
  const [tela, setTela] = useState<Tela>("inicio");
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [nome, setNome] = useState(nomeInicial);
  const [email, setEmail] = useState("");
  const [forma, setForma] = useState<"pix" | "cartao">("pix");
  const [codigoAssinatura, setCodigoAssinatura] = useState<string | null>(null);
  const [erroCampo, setErroCampo] = useState<{ nome?: string; telefone?: string; email?: string }>({});
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<RespostaAssinante | null>(null);
  const [escolhido, setEscolhido] = useState<PlanoPublicoVM | null>(null);
  const [pix, setPix] = useState<PixPlano | null>(null);
  const [pixExpirado, setPixExpirado] = useState(false);
  const [pixInformado, setPixInformado] = useState(false);
  const [validaAte, setValidaAte] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  // Telefone lembrado deste aparelho chega depois da primeira renderização.
  useEffect(() => {
    if (telefoneInicial) setTelefone((atual) => atual || telefoneInicial);
    if (nomeInicial) setNome((atual) => atual || nomeInicial);
  }, [telefoneInicial, nomeInicial]);

  // Enquanto o Pix do plano não é pago: contagem e consulta do pagamento.
  useEffect(() => {
    if (tela !== "pix" || !pix || pixExpirado) return;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    let ativo = true;
    async function consultar() {
      try {
        const resposta = await fetch(`/api/publico/${slug}/assinaturas/${pix!.pagamentoId}`, { cache: "no-store" });
        if (!resposta.ok || !ativo) return;
        const dados = await resposta.json();
        if (!ativo) return;
        if (dados.status === "PAGO") {
          setValidaAte(dados.validaAte ?? null);
          setCodigoAssinatura(dados.codigo ?? null);
          setTela("ativo");
        } else if (dados.status === "EXPIRADO") {
          setPixExpirado(true);
        } else if (dados.informado) {
          setPixInformado(true);
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
  }, [tela, pix, pixExpirado, slug]);

  function irPara(nova: Tela) {
    setErro(null);
    setErroCampo({});
    setTela(nova);
  }

  const dataCurta = (iso: string) => formatarDataInstante(new Date(iso), { day: "2-digit", month: "2-digit" }, fuso);

  async function consultarAssinante(telefoneConsulta: string): Promise<RespostaAssinante | null> {
    const resposta = await fetch(`/api/publico/${slug}/assinante`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: telefoneConsulta }),
    });
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      setErro(dados?.erro ?? "Não foi possível consultar o plano agora.");
      return null;
    }
    return dados as RespostaAssinante;
  }

  function seguirComoAssinante(dados: RespostaAssinante, telefoneUsado: string) {
    if (dados.situacao !== "ATIVA" || !dados.plano || !dados.validaAte) return false;
    if (dados.usosRestantes === 0) return false;
    onLembrar({ telefone: telefoneUsado });
    onAssinante({
      telefone: telefoneUsado,
      plano: { id: dados.plano.id, nome: dados.plano.nome, servicoIds: dados.plano.servicoIds },
      validaAte: dados.validaAte,
      usosRestantes: dados.usosRestantes ?? null,
    });
    return true;
  }

  async function aoConsultar(evento: FormEvent) {
    evento.preventDefault();
    if (apenasDigitos(telefone).length < 10) {
      setErroCampo({ telefone: "Informe o WhatsApp com DDD." });
      return;
    }
    setErroCampo({});
    setErro(null);
    setCarregando(true);
    try {
      const dados = await consultarAssinante(telefone);
      if (!dados) return;
      if (!seguirComoAssinante(dados, telefone)) setResultado(dados);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function gerarPix(planoId: string, planoNome: string, comNome: boolean) {
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await fetch(`/api/publico/${slug}/assinaturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planoId, telefone, ...(comNome ? { nome } : {}) }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        if (dados?.campo === "nome") {
          setEscolhido(planos.find((p) => p.id === planoId) ?? null);
          irPara("assinar");
          setErroCampo({ nome: dados.erro });
          return;
        }
        setErro(dados?.erro ?? "Não foi possível gerar o Pix agora.");
        return;
      }
      onLembrar({ telefone, ...(comNome ? { nome } : {}) });
      setAgora(Date.now());
      setPixExpirado(false);
      setPix({ ...dados.pagamento, planoNome });
      irPara("pix");
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function aoAssinar(evento: FormEvent) {
    evento.preventDefault();
    if (!escolhido) return;
    const validacao: { nome?: string; telefone?: string; email?: string } = {};
    if (nome.trim().length < 2) validacao.nome = "Informe seu nome.";
    if (apenasDigitos(telefone).length < 10) validacao.telefone = "Informe o WhatsApp com DDD.";
    if (forma === "cartao" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) validacao.email = "Informe um e-mail válido.";
    setErroCampo(validacao);
    if (Object.keys(validacao).length > 0) return;
    if (forma === "pix") {
      await gerarPix(escolhido.id, escolhido.nome, true);
      return;
    }

    // Cartão: o cliente vai pra página do Mercado Pago e volta pra página
    // da assinatura dele.
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await fetch(`/api/publico/${slug}/assinaturas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planoId: escolhido.id, telefone, nome, forma: "cartao", email: email.trim() }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok || !dados?.redirecionar) {
        if (dados?.campo === "email") setErroCampo({ email: dados.erro });
        else setErro(dados?.erro ?? "Não foi possível abrir o pagamento no cartão agora.");
        setCarregando(false);
        return;
      }
      onLembrar({ telefone, nome });
      window.location.href = dados.redirecionar;
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setCarregando(false);
    }
  }

  async function agendarAgora() {
    setErro(null);
    setCarregando(true);
    try {
      const dados = await consultarAssinante(telefone);
      if (dados && !seguirComoAssinante(dados, telefone)) {
        setResultado(dados);
        irPara("consultar");
      }
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const menorValor = Math.min(...planos.map((p) => p.valor));

  if (tela === "inicio") {
    return (
      <section className="etapa" aria-labelledby="etapa-plano">
        <h2 id="etapa-plano" className="etapa-titulo">
          Como você quer agendar?
        </h2>
        <div className="opcoes">
          <button type="button" className="opcao" onClick={onAvulso}>
            <span className="opcao-icone" aria-hidden="true">
              <Scissors size={20} />
            </span>
            <span className="opcao-texto">
              <span className="opcao-titulo">Agendar sem plano</span>
              <span className="opcao-sub">Escolha o serviço e o horário</span>
            </span>
            <ChevronRight size={18} className="texto-secundario" aria-hidden="true" />
          </button>
          <button type="button" className="opcao" onClick={() => irPara("consultar")}>
            <span className="opcao-icone" aria-hidden="true">
              <BadgeCheck size={20} />
            </span>
            <span className="opcao-texto">
              <span className="opcao-titulo">Sou assinante</span>
              <span className="opcao-sub">Agende pelo seu plano de corte</span>
            </span>
            <ChevronRight size={18} className="texto-secundario" aria-hidden="true" />
          </button>
          <button type="button" className="opcao" onClick={() => irPara("planos")}>
            <span className="opcao-icone" aria-hidden="true">
              <Repeat size={20} />
            </span>
            <span className="opcao-texto">
              <span className="opcao-titulo">Conhecer os planos</span>
              <span className="opcao-sub num">A partir de {formatarMoeda(menorValor)} por mês</span>
            </span>
            <ChevronRight size={18} className="texto-secundario" aria-hidden="true" />
          </button>
        </div>
      </section>
    );
  }

  if (tela === "consultar") {
    const plano = resultado?.plano;
    const podeRenovar = pixOnline && plano?.ativo;
    const mesAtual =
      resultado?.situacao === "ATIVA" && resultado.validaAte
        ? mesDoPlano(new Date(resultado.validaAte), new Date())
        : null;
    return (
      <section className="etapa" aria-labelledby="etapa-assinante">
        <Voltar onClick={() => { setResultado(null); irPara("inicio"); }} />
        <h2 id="etapa-assinante" className="etapa-titulo">
          Sou assinante
        </h2>
        {!resultado ? (
          <form onSubmit={aoConsultar} className="card form" noValidate>
            {erro && <Alerta tom="perigo">{erro}</Alerta>}
            <Campo id="assinante-telefone" rotulo="Seu WhatsApp" dica="O mesmo número do plano." erro={erroCampo.telefone}>
              <input
                {...ariaCampo("assinante-telefone", { dica: true, erro: erroCampo.telefone })}
                className="input num"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 91234-5678"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </Campo>
            <Botao type="submit" variante="primary" bloco carregando={carregando} textoCarregando="Consultando…">
              Continuar
            </Botao>
          </form>
        ) : (
          <div className="card form" aria-live="polite">
            {erro && <Alerta tom="perigo">{erro}</Alerta>}
            {plano && resultado.situacao !== "NENHUMA" && (
              <p className="texto-secundario texto-pequeno">
                Seu plano: <strong style={{ color: "var(--color-text)" }}>{plano.nome}</strong>
              </p>
            )}
            {resultado.situacao === "NENHUMA" || !plano ? (
              <p>Não encontramos um plano para esse WhatsApp.</p>
            ) : resultado.situacao === "ATIVA" ? (
              <p>
                {plano.usosPorMes === 1
                  ? "Você já usou o atendimento do plano neste mês."
                  : `Você já usou os ${plano.usosPorMes} atendimentos do plano neste mês.`}
                {mesAtual && ` Eles voltam em ${dataCurta(mesAtual.fim.toISOString())}.`}
              </p>
            ) : resultado.situacao === "AGUARDANDO_PAGAMENTO" ? (
              <p>O primeiro mês ainda não foi pago.</p>
            ) : resultado.situacao === "CANCELADA" ? (
              <p>Este plano foi encerrado. Fale com a barbearia.</p>
            ) : (
              <p>
                O plano venceu{resultado.validaAte ? ` em ${dataCurta(resultado.validaAte)}` : ""}. Renove para agendar por ele.
              </p>
            )}
            <div className="pilha-acoes">
              {plano && (resultado.situacao === "VENCIDA" || resultado.situacao === "AGUARDANDO_PAGAMENTO") && podeRenovar && (
                <Botao
                  variante="primary"
                  bloco
                  carregando={carregando}
                  textoCarregando="Gerando Pix…"
                  onClick={() => gerarPix(plano.id, plano.nome, false)}
                >
                  Pagar {formatarMoeda(plano.valor)} no Pix e renovar
                </Botao>
              )}
              {(resultado.situacao === "NENHUMA" || !plano) && (
                <Botao variante="primary" bloco onClick={() => irPara("planos")}>
                  Conhecer os planos
                </Botao>
              )}
              <Botao bloco onClick={onAvulso}>
                Agendar sem plano
              </Botao>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResultado(null)}>
                Usar outro número
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (tela === "planos") {
    return (
      <section className="etapa" aria-labelledby="etapa-planos">
        <Voltar onClick={() => irPara("inicio")} />
        <h2 id="etapa-planos" className="etapa-titulo">
          Planos de corte
        </h2>
        <ul className="planos-publicos">
          {planos.map((p) => (
            <li key={p.id} className="card plano-publico">
              <div className="plano-publico-topo">
                <h3 className="plano-publico-nome">{p.nome}</h3>
                <p className="num">
                  <span className="plano-publico-valor">{formatarMoeda(p.valor)}</span>
                  <span className="texto-secundario">/mês</span>
                </p>
              </div>
              <p className="texto-secundario texto-pequeno">{descreverUsos(p.usosPorMes)}</p>
              <ul className="plano-publico-servicos">
                {p.servicos.map((s) => (
                  <li key={s.id}>
                    <BadgeCheck size={16} aria-hidden="true" />
                    {s.nome}
                  </li>
                ))}
              </ul>
              {pixOnline && (
                <Botao
                  variante="primary"
                  bloco
                  onClick={() => {
                    setEscolhido(p);
                    irPara("assinar");
                  }}
                >
                  Assinar {p.nome}
                </Botao>
              )}
            </li>
          ))}
        </ul>
        {!pixOnline &&
          (whatsappBarbearia ? (
            <a href={whatsappBarbearia} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-bloco">
              <MessageCircle size={18} aria-hidden="true" />
              Assinar pelo WhatsApp da barbearia
            </a>
          ) : (
            <p className="texto-secundario">Para assinar, fale com a barbearia.</p>
          ))}
        <p className="texto-pequeno texto-secundario">
          O plano vale por 30 dias a partir do pagamento. Para continuar, é só renovar aqui, em &quot;Sou assinante&quot;.
        </p>
      </section>
    );
  }

  if (tela === "assinar" && escolhido) {
    return (
      <section className="etapa" aria-labelledby="etapa-assinar">
        <Voltar onClick={() => irPara("planos")} />
        <h2 id="etapa-assinar" className="etapa-titulo">
          Assinar {escolhido.nome}
        </h2>
        <form onSubmit={aoAssinar} className="card form" noValidate>
          {erro && <Alerta tom="perigo">{erro}</Alerta>}
          <p className="texto-secundario">
            <span className="num">{formatarMoeda(escolhido.valor)}</span> por mês ·{" "}
            {descreverUsos(escolhido.usosPorMes).toLowerCase()}
          </p>
          <Campo id="plano-nome" rotulo="Nome" erro={erroCampo.nome}>
            <input
              {...ariaCampo("plano-nome", { erro: erroCampo.nome })}
              className="input"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Campo>
          <Campo id="plano-telefone" rotulo="WhatsApp" dica="É por ele que você agenda pelo plano." erro={erroCampo.telefone}>
            <input
              {...ariaCampo("plano-telefone", { dica: true, erro: erroCampo.telefone })}
              className="input num"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 91234-5678"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </Campo>
          {cartaoOnline && (
          <fieldset className="campo forma-plano">
            <legend className="campo-rotulo">Como pagar</legend>
            <label className="forma-plano-opcao">
              <input type="radio" name="forma-plano" checked={forma === "pix"} onChange={() => setForma("pix")} />
              <span>
                <span className="forma-plano-titulo">Pix</span>
                <span className="forma-plano-sub">Paga agora e renova a cada mês, quando quiser</span>
              </span>
            </label>
            <label className="forma-plano-opcao">
              <input type="radio" name="forma-plano" checked={forma === "cartao"} onChange={() => setForma("cartao")} />
              <span>
                <span className="forma-plano-titulo">Cartão de crédito</span>
                <span className="forma-plano-sub">Renova sozinho todo mês. Cancele quando quiser</span>
              </span>
            </label>
          </fieldset>
          )}
          {forma === "cartao" && (
            <Campo id="plano-email" rotulo="E-mail" dica="O Mercado Pago pede para a assinatura no cartão." erro={erroCampo.email}>
              <input
                {...ariaCampo("plano-email", { dica: true, erro: erroCampo.email })}
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Campo>
          )}
          <Botao
            type="submit"
            variante="primary"
            bloco
            carregando={carregando}
            textoCarregando={forma === "pix" ? "Gerando Pix…" : "Abrindo o Mercado Pago…"}
          >
            {forma === "pix"
              ? `Pagar ${formatarMoeda(escolhido.valor)} no Pix`
              : `Assinar no cartão por ${formatarMoeda(escolhido.valor)}/mês`}
          </Botao>
          {forma === "cartao" && (
            <p className="texto-pequeno texto-secundario">
              Você põe o cartão na página do Mercado Pago e volta para cá. A primeira cobrança sai na hora.
            </p>
          )}
        </form>
      </section>
    );
  }

  if (tela === "pix" && pix) {
    return (
      <section className="card confirmacao" aria-labelledby="titulo-pix-plano">
        <h2 id="titulo-pix-plano" className="etapa-titulo">
          {pixExpirado ? "O prazo do Pix acabou" : `Pagar ${pix.planoNome}`}
        </h2>
        {pixExpirado ? (
          <>
            <p className="texto-secundario">Se você chegou a pagar, fale com a barbearia. Se não, gere outro Pix.</p>
            {erro && <Alerta tom="perigo">{erro}</Alerta>}
            <Botao
              variante="primary"
              carregando={carregando}
              textoCarregando="Gerando Pix…"
              onClick={() => {
                const plano = planos.find((p) => p.nome === pix.planoNome);
                if (plano) gerarPix(plano.id, plano.nome, nome.trim().length >= 2);
              }}
            >
              Gerar outro Pix
            </Botao>
          </>
        ) : (
          <PixDoPlano
            slug={slug}
            pix={pix}
            agora={agora}
            informado={pixInformado}
            aoInformar={() => setPixInformado(true)}
            aoExpirar={() => setPixExpirado(true)}
            depoisDePago="o plano passa a valer por 30 dias"
          />
        )}
      </section>
    );
  }

  if (tela === "ativo") {
    return (
      <section className="card confirmacao" aria-live="polite">
        <span className="confirmacao-icone" aria-hidden="true">
          <BadgeCheck size={28} />
        </span>
        <h2 className="etapa-titulo">Plano ativo</h2>
        <p className="texto-secundario">
          {pix?.planoNome ?? "Seu plano"}
          {validaAte ? ` vale até ${dataCurta(validaAte)}.` : " está valendo."} Para agendar por ele, escolha &quot;Sou
          assinante&quot; e use o mesmo WhatsApp.
        </p>
        {erro && <Alerta tom="perigo">{erro}</Alerta>}
        <Botao
          variante="primary"
          icone={<CalendarPlus size={18} aria-hidden="true" />}
          carregando={carregando}
          textoCarregando="Abrindo…"
          onClick={agendarAgora}
        >
          Agendar agora
        </Botao>
        {codigoAssinatura && (
          <>
            <Link href={`/minha-assinatura/${codigoAssinatura}`} className="btn btn-ghost btn-sm">
              Ver minha assinatura
            </Link>
            <p className="texto-pequeno texto-secundario">
              Guarde o link da assinatura: é por ele que você vê a validade e renova.
            </p>
          </>
        )}
      </section>
    );
  }

  return null;
}
