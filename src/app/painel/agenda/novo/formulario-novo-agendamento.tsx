"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { Avatar } from "@/components/ui/avatar";
import { apenasDigitos, formatarDuracao, formatarHora, formatarMoeda, formatarTelefone } from "@/lib/formatar";
import type { ServicoOpcaoVM } from "@/components/agenda/tipos";

interface ClienteResumo {
  id: string;
  nome: string;
  telefone: string;
}

type ModoCliente = "buscar" | "novo";

interface Erros {
  cliente?: string;
  nome?: string;
  telefone?: string;
  horario?: string;
  geral?: string;
}

export function FormularioNovoAgendamento({
  servicos,
  profissionais,
  clienteInicial,
  dataInicial,
  dataMinima,
  profissionalInicial,
}: {
  servicos: ServicoOpcaoVM[];
  profissionais: { id: string; nome: string }[];
  clienteInicial: ClienteResumo | null;
  dataInicial: string;
  dataMinima: string;
  profissionalInicial: string;
}) {
  const router = useRouter();

  const [cliente, setCliente] = useState<ClienteResumo | null>(clienteInicial);
  const [modoCliente, setModoCliente] = useState<ModoCliente>("buscar");
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ClienteResumo[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const [profissionalId, setProfissionalId] = useState(profissionalInicial);
  const [data, setData] = useState(dataInicial);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState<string | null>(null);
  const [horario, setHorario] = useState<string | null>(null);

  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);

  // Busca de cliente com uma pequena espera entre as teclas.
  useEffect(() => {
    if (cliente || modoCliente !== "buscar") return;
    const busca = termo.trim();
    if (busca.length < 2) {
      setResultados(null);
      return;
    }
    let ativo = true;
    const espera = setTimeout(async () => {
      setBuscando(true);
      try {
        const resposta = await fetch(`/api/painel/clientes?q=${encodeURIComponent(busca)}`);
        const dados = await resposta.json().catch(() => null);
        if (ativo) setResultados(resposta.ok ? (dados?.clientes ?? []) : []);
      } catch {
        if (ativo) setResultados([]);
      } finally {
        if (ativo) setBuscando(false);
      }
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [termo, cliente, modoCliente]);

  // Horários livres: recarrega quando serviço, profissional ou data mudam.
  useEffect(() => {
    setHorario(null);
    if (!servicoId || !profissionalId || !data) return;
    let ativo = true;
    setCarregandoHorarios(true);
    setErroHorarios(null);
    const parametros = new URLSearchParams({ servicoId, profissionalId, data });
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
        if (ativo) setCarregandoHorarios(false);
      });
    return () => {
      ativo = false;
    };
  }, [servicoId, profissionalId, data]);

  function escolherCliente(c: ClienteResumo) {
    setCliente(c);
    setErros((e) => ({ ...e, cliente: undefined }));
  }

  function trocarCliente() {
    setCliente(null);
    setModoCliente("buscar");
    setTermo("");
    setResultados(null);
  }

  function cadastrarNovo() {
    // Aproveita o que já foi digitado na busca.
    const digitos = apenasDigitos(termo);
    if (digitos.length >= 8) setTelefone(termo.trim());
    else if (termo.trim()) setNome(termo.trim());
    setModoCliente("novo");
    setErros((e) => ({ ...e, cliente: undefined }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const validacao: Erros = {};
    if (!cliente) {
      if (modoCliente === "buscar") validacao.cliente = "Escolha um cliente ou cadastre um novo.";
      else {
        if (nome.trim().length < 2) validacao.nome = "Informe o nome do cliente.";
        if (apenasDigitos(telefone).length < 8) validacao.telefone = "Informe um telefone válido, com DDD.";
      }
    }
    if (!horario) validacao.horario = "Escolha um horário.";
    setErros(validacao);
    if (Object.keys(validacao).length > 0) return;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicoId,
          profissionalId,
          inicio: horario,
          cliente: cliente ? { id: cliente.id } : { nome: nome.trim(), telefone },
        }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErros({ geral: dados?.erro ?? "Não foi possível agendar." });
        setSalvando(false);
        // Horário tomado nesse meio-tempo: atualiza a lista pra escolher outro.
        if (resposta.status === 409) recarregarHorarios();
        return;
      }
      router.push(`/painel/agenda?data=${data}`);
      router.refresh();
    } catch {
      setErros({ geral: "Falha de conexão. Seus dados continuam aqui — tente novamente." });
      setSalvando(false);
    }
  }

  function recarregarHorarios() {
    const parametros = new URLSearchParams({ servicoId, profissionalId, data });
    fetch(`/api/painel/horarios?${parametros}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => {
        if (dados) setHorarios(dados.horarios);
        setHorario(null);
      })
      .catch(() => {});
  }

  const servico = servicos.find((s) => s.id === servicoId);

  return (
    <form onSubmit={aoEnviar} className="card form" noValidate style={{ maxWidth: 640 }}>
      {erros.geral && <Alerta tom="perigo">{erros.geral}</Alerta>}

      <section className="form-secao" aria-labelledby="secao-cliente">
        <h2 id="secao-cliente" className="form-secao-titulo">Cliente</h2>

        {cliente ? (
          <div className="escolha-resumo">
            <Avatar nome={cliente.nome} />
            <div className="escolha-resumo-texto">
              <p className="escolha-resumo-valor">{cliente.nome}</p>
              <p className="escolha-resumo-rotulo num">{formatarTelefone(cliente.telefone)}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={trocarCliente}>
              Trocar<span className="sr-only"> cliente</span>
            </button>
          </div>
        ) : modoCliente === "buscar" ? (
          <>
            <Campo id="busca-cliente" rotulo="Buscar cliente" dica="Nome ou telefone." erro={erros.cliente}>
              <div className="select-compacto">
                <Search size={18} aria-hidden="true" />
                <input
                  {...ariaCampo("busca-cliente", { dica: true, erro: erros.cliente })}
                  type="search"
                  className="input"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </Campo>
            <div aria-live="polite" aria-busy={buscando}>
              {resultados && resultados.length > 0 && (
                <ul className="resultados-cliente" aria-label="Clientes encontrados">
                  {resultados.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="resultado-cliente" onClick={() => escolherCliente(c)}>
                        <Avatar nome={c.nome} tamanho={32} />
                        <span className="lista-item-principal">
                          <span className="lista-item-titulo">{c.nome}</span>
                          <span className="lista-item-sub num">{formatarTelefone(c.telefone)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {resultados && resultados.length === 0 && !buscando && (
                <p className="texto-secundario texto-pequeno">Nenhum cliente encontrado com “{termo.trim()}”.</p>
              )}
            </div>
            <div>
              <Botao pequeno variante="secondary" icone={<UserPlus size={16} aria-hidden="true" />} onClick={cadastrarNovo}>
                Cliente novo
              </Botao>
            </div>
          </>
        ) : (
          <>
            <div className="form-grade form-grade-2">
              <Campo id="nome-cliente" rotulo="Nome" erro={erros.nome}>
                <input
                  {...ariaCampo("nome-cliente", { erro: erros.nome })}
                  className="input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="off"
                />
              </Campo>
              <Campo
                id="telefone-cliente"
                rotulo="Telefone"
                dica="Com DDD. Se já estiver cadastrado, o agendamento vai para esse cliente."
                erro={erros.telefone}
              >
                <input
                  {...ariaCampo("telefone-cliente", { dica: true, erro: erros.telefone })}
                  className="input num"
                  type="tel"
                  inputMode="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 91234-5678"
                  autoComplete="off"
                />
              </Campo>
            </div>
            <div>
              <Botao pequeno variante="ghost" icone={<Search size={16} aria-hidden="true" />} onClick={trocarCliente}>
                Buscar cliente cadastrado
              </Botao>
            </div>
          </>
        )}
      </section>

      <section className="form-secao" aria-labelledby="secao-atendimento">
        <h2 id="secao-atendimento" className="form-secao-titulo">Atendimento</h2>
        <div className={profissionais.length > 1 ? "form-grade form-grade-2" : undefined}>
          <Campo id="servico" rotulo="Serviço">
            <select id="servico" className="input" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} · {formatarDuracao(s.duracaoMinutos)} · {formatarMoeda(s.preco)}
                </option>
              ))}
            </select>
          </Campo>
          {profissionais.length > 1 && (
            <Campo id="profissional" rotulo="Profissional">
              <select
                id="profissional"
                className="input"
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
              >
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
          )}
        </div>
        <Campo id="data" rotulo="Data">
          <input
            id="data"
            type="date"
            className="input"
            style={{ maxWidth: 220 }}
            value={data}
            min={dataMinima}
            onChange={(e) => e.target.value && setData(e.target.value)}
            required
          />
        </Campo>
      </section>

      <section className="form-secao" aria-labelledby="secao-horario">
        <h2 id="secao-horario" className="form-secao-titulo">Horário</h2>
        <div aria-live="polite" aria-busy={carregandoHorarios}>
          {carregandoHorarios ? (
            <p className="pix-espera">
              <span className="spinner" aria-hidden="true" />
              Carregando horários…
            </p>
          ) : erroHorarios ? (
            <Alerta tom="perigo">{erroHorarios}</Alerta>
          ) : horarios && horarios.length === 0 ? (
            <p className="texto-secundario">
              Sem horários livres nesse dia para {servico?.nome ?? "esse serviço"}. Tente outra data ou confira o
              expediente em{" "}
              <Link href="/painel/disponibilidade" className="link">
                Meus horários
              </Link>
              .
            </p>
          ) : horarios ? (
            <div className="horarios" role="group" aria-label="Horários livres">
              {horarios.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="horario"
                  aria-pressed={horario === h}
                  onClick={() => {
                    setHorario(h);
                    setErros((e) => ({ ...e, horario: undefined }));
                  }}
                >
                  {formatarHora(new Date(h))}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {erros.horario && (
          <p id="horario-erro" className="campo-erro">
            {erros.horario}
          </p>
        )}
      </section>

      <div className="form-acoes">
        <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Agendando…">
          Agendar
        </Botao>
        <Link href="/painel/agenda" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
