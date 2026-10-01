"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";
import { formatarMoeda } from "@/lib/formatar";

interface Props {
  conectado: boolean;
  contaDescricao: string | null;
  sinalAtivo: boolean;
  sinalPercentual: number;
  chaveConfigurada: boolean;
  percentualMin: number;
  percentualMax: number;
}

export function SecaoPagamento(props: Props) {
  const router = useRouter();
  const [ativo, setAtivo] = useState(props.sinalAtivo);
  const [percentual, setPercentual] = useState(String(props.sinalPercentual));
  const [token, setToken] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroPercentual, setErroPercentual] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmarDesconectar, setConfirmarDesconectar] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [erroDesconectar, setErroDesconectar] = useState<string | null>(null);

  const numero = Number(percentual);
  const percentualValido = Number.isInteger(numero) && numero >= props.percentualMin && numero <= props.percentualMax;

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    if (!percentualValido) {
      setErroPercentual(`Use um número inteiro entre ${props.percentualMin} e ${props.percentualMax}.`);
      return;
    }
    setErroPercentual(null);
    if (ativo && !props.conectado && !token.trim()) {
      setErro("Cole o Access Token do Mercado Pago para ativar o sinal.");
      return;
    }

    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/configuracoes/pagamento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sinalAtivo: ativo,
          sinalPercentual: numero,
          ...(token.trim() ? { accessToken: token.trim() } : {}),
        }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível salvar.");
        return;
      }
      setToken("");
      setAviso("Configuração salva.");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Seus dados continuam aqui — tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function desconectar() {
    setDesconectando(true);
    setErroDesconectar(null);
    try {
      const resposta = await fetch("/api/painel/configuracoes/pagamento", { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErroDesconectar(dados?.erro ?? "Não foi possível desconectar. Tente novamente.");
        return;
      }
      setConfirmarDesconectar(false);
      setAtivo(false);
      setAviso("Conta do Mercado Pago desconectada. O sinal foi desativado.");
      router.refresh();
    } catch {
      setErroDesconectar("Falha de conexão. Tente novamente.");
    } finally {
      setDesconectando(false);
    }
  }

  return (
    <section className="card" aria-labelledby="titulo-pagamento">
      <div className="card-cabecalho">
        <div>
          <h2 id="titulo-pagamento" className="card-titulo">
            Sinal antecipado
          </h2>
          <p className="card-descricao">
            No agendamento online, o cliente paga parte do valor por Pix. O horário só é confirmado depois do pagamento.
          </p>
        </div>
      </div>

      <form onSubmit={salvar} className="form" noValidate>
        {erro && <Alerta tom="perigo">{erro}</Alerta>}
        {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}
        {!props.chaveConfigurada && (
          <Alerta tom="atencao" titulo="Falta uma configuração no servidor">
            Defina a variável SEGREDOS_CHAVE no ambiente para o token poder ser guardado com segurança.
          </Alerta>
        )}

        {props.conectado ? (
          <div className="conta-conectada">
            <CheckCircle2 size={20} aria-hidden="true" />
            <div className="lista-item-principal">
              <p style={{ fontWeight: 700 }}>Mercado Pago conectado</p>
              {props.contaDescricao && <p className="texto-secundario texto-pequeno">{props.contaDescricao}</p>}
            </div>
            <Botao pequeno variante="ghost" onClick={() => setConfirmarDesconectar(true)}>
              Desconectar
            </Botao>
          </div>
        ) : null}

        <Campo
          id="mp-token"
          rotulo={props.conectado ? "Trocar Access Token" : "Access Token do Mercado Pago"}
          opcional={props.conectado}
          dica="Em mercadopago.com.br/developers, abra sua aplicação e copie o Access Token das credenciais de produção. Ele fica guardado cifrado e não é exibido de novo."
        >
          <input
            {...ariaCampo("mp-token", { dica: true })}
            type="password"
            className="input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={!props.chaveConfigurada}
          />
        </Campo>

        <label className="interruptor">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          <span className="interruptor-trilho" aria-hidden="true" />
          Cobrar sinal no agendamento online
        </label>

        <Campo
          id="sinal-percentual"
          rotulo="Percentual do sinal"
          erro={erroPercentual}
          dica={
            percentualValido
              ? `Num serviço de ${formatarMoeda(100)}, o cliente paga ${formatarMoeda(numero)} no Pix e o restante no atendimento.`
              : undefined
          }
        >
          <div className="input-sufixo">
            <input
              {...ariaCampo("sinal-percentual", { dica: percentualValido, erro: erroPercentual })}
              type="number"
              inputMode="numeric"
              min={props.percentualMin}
              max={props.percentualMax}
              step={1}
              className="input num"
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
            />
            <span aria-hidden="true">%</span>
          </div>
        </Campo>

        <div className="form-acoes">
          <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
            Salvar
          </Botao>
        </div>
      </form>

      <DialogoConfirmacao
        aberto={confirmarDesconectar}
        titulo="Desconectar o Mercado Pago?"
        descricao="O token é apagado e o sinal deixa de ser cobrado nos próximos agendamentos."
        rotuloConfirmar="Desconectar"
        textoCarregando="Desconectando…"
        perigo
        processando={desconectando}
        erro={erroDesconectar}
        aoConfirmar={desconectar}
        aoCancelar={() => setConfirmarDesconectar(false)}
      />
    </section>
  );
}
