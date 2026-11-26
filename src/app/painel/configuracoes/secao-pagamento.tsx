"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";
import { formatarMoeda } from "@/lib/formatar";
import { ROTULO_TIPO_CHAVE, exibirChave, type TipoChave } from "@/lib/pix-brcode";

interface Props {
  mercadoPago: {
    conectado: boolean;
    contaDescricao: string | null;
    // Conectado pelo botão (renova sozinho); falso: token colado à mão.
    porBotao: boolean;
    // A conexão pelo botão venceu (a renovação falhou): precisa conectar de novo.
    vencido: boolean;
  };
  // O botão "Conectar com Mercado Pago" está configurado no servidor.
  conexaoDisponivel: boolean;
  chavePix: { tipo: TipoChave; chave: string; cidade: string } | null;
  // Volta do Mercado Pago (?mp=...).
  resultadoConexao: string | null;
  sinalAtivo: boolean;
  sinalPercentual: number;
  chaveConfigurada: boolean;
  percentualMin: number;
  percentualMax: number;
}

const RESULTADOS: Record<string, { tom: "sucesso" | "info" | "atencao" | "perigo"; texto: string }> = {
  conectado: { tom: "sucesso", texto: "Mercado Pago conectado. A confirmação do Pix agora é automática." },
  cancelado: { tom: "info", texto: "A conexão foi cancelada no Mercado Pago. Nada mudou por aqui." },
  expirado: { tom: "atencao", texto: "A tentativa de conexão expirou. Toque em Conectar com Mercado Pago de novo." },
  "sem-permissao": { tom: "perigo", texto: "Só o dono da barbearia pode conectar o Mercado Pago. Entre com a conta do dono e tente de novo." },
  indisponivel: { tom: "atencao", texto: "A conexão com o Mercado Pago ainda não está disponível. Use a sua chave Pix ou o Access Token (avançado)." },
  "sem-chave": { tom: "atencao", texto: "O servidor ainda não tem a chave para guardar o token com segurança (SEGREDOS_CHAVE)." },
  "pix-pendente": {
    tom: "atencao",
    texto: "Há Pix do Mercado Pago aguardando pagamento. Espere ele ser pago ou vencer (até 30 minutos) para trocar de conta.",
  },
  erro: { tom: "perigo", texto: "O Mercado Pago não confirmou a conexão. Tente de novo em instantes." },
};

const TIPOS: TipoChave[] = ["CPF", "CNPJ", "TELEFONE", "EMAIL", "ALEATORIA"];

export function SecaoPagamento(props: Props) {
  const router = useRouter();
  const mp = props.mercadoPago;
  const mpAtivo = mp.conectado && !mp.vencido;
  const [ativo, setAtivo] = useState(props.sinalAtivo);
  const [percentual, setPercentual] = useState(String(props.sinalPercentual));
  const [token, setToken] = useState("");
  const [tipoChave, setTipoChave] = useState<TipoChave>(props.chavePix?.tipo ?? "CPF");
  const [chave, setChave] = useState("");
  const [cidade, setCidade] = useState(props.chavePix?.cidade ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroPercentual, setErroPercentual] = useState<string | null>(null);
  const [erroChave, setErroChave] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<"desconectar" | "remover-chave" | null>(null);
  const [processandoDialogo, setProcessandoDialogo] = useState(false);
  const [erroDialogo, setErroDialogo] = useState<string | null>(null);
  const resultado = props.resultadoConexao ? RESULTADOS[props.resultadoConexao] : null;

  const numero = Number(percentual);
  const percentualValido = Number.isInteger(numero) && numero >= props.percentualMin && numero <= props.percentualMax;
  const temChave = Boolean(props.chavePix) || chave.trim().length > 0;
  const metodoDoSinal = mpAtivo || token.trim() ? "mercadopago" : temChave ? "chave" : null;

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setErroChave(null);
    setAviso(null);
    if (!percentualValido) {
      setErroPercentual(`Use um número inteiro entre ${props.percentualMin} e ${props.percentualMax}.`);
      return;
    }
    setErroPercentual(null);
    if (ativo && !metodoDoSinal) {
      setErro("Para cobrar sinal, conecte o Mercado Pago ou cadastre a sua chave Pix.");
      return;
    }
    const mudouCidade = props.chavePix && cidade.trim() !== props.chavePix.cidade;
    const enviarChave = chave.trim() || mudouCidade;

    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/configuracoes/pagamento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sinalAtivo: ativo,
          sinalPercentual: numero,
          ...(token.trim() ? { accessToken: token.trim() } : {}),
          ...(enviarChave
            ? { chavePix: { tipo: chave.trim() ? tipoChave : props.chavePix!.tipo, chave: chave.trim() || props.chavePix!.chave, cidade: cidade.trim() } }
            : {}),
        }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        if (dados?.campo === "chavePix" || dados?.campo === "cidadePix") setErroChave(dados.erro);
        else setErro(dados?.erro ?? "Não foi possível salvar.");
        return;
      }
      setToken("");
      setChave("");
      setAviso("Configuração salva.");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Seus dados continuam aqui — tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarDialogo() {
    setProcessandoDialogo(true);
    setErroDialogo(null);
    try {
      const resposta =
        confirmar === "desconectar"
          ? await fetch("/api/painel/configuracoes/pagamento", { method: "DELETE" })
          : await fetch("/api/painel/configuracoes/pagamento", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              // Sem chave e sem Mercado Pago, o sinal desliga junto.
              body: JSON.stringify({ sinalAtivo: props.sinalAtivo && mpAtivo, sinalPercentual: props.sinalPercentual, chavePix: null }),
            });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErroDialogo(dados?.erro ?? "Não foi possível concluir. Tente novamente.");
        return;
      }
      const qual = confirmar;
      setConfirmar(null);
      if (qual === "desconectar") {
        if (!props.chavePix) setAtivo(false);
        setAviso(props.chavePix ? "Mercado Pago desconectado. O sinal passa a usar a sua chave Pix." : "Mercado Pago desconectado. O sinal foi desativado.");
      } else {
        if (!mpAtivo) setAtivo(false);
        setAviso("Chave Pix removida.");
      }
      router.refresh();
    } catch {
      setErroDialogo("Falha de conexão. Tente novamente.");
    } finally {
      setProcessandoDialogo(false);
    }
  }

  const campoToken = (
    <Campo
      id="mp-token"
      rotulo={mp.conectado ? "Trocar por um Access Token" : "Access Token do Mercado Pago"}
      opcional
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
  );

  return (
    <section className="card" aria-labelledby="titulo-pagamento">
      <div className="card-cabecalho">
        <div>
          <h2 id="titulo-pagamento" className="card-titulo">
            Pagamentos online
          </h2>
          <p className="card-descricao">Como você recebe o sinal e os planos de corte pelo link de agendamento.</p>
        </div>
      </div>

      <form onSubmit={salvar} className="form" noValidate>
        {resultado && <Alerta tom={resultado.tom}>{resultado.texto}</Alerta>}
        {erro && <Alerta tom="perigo">{erro}</Alerta>}
        {aviso && <Alerta tom="sucesso">{aviso}</Alerta>}
        {!props.chaveConfigurada && (
          <Alerta tom="atencao" titulo="Falta uma configuração no servidor">
            Defina a variável SEGREDOS_CHAVE no ambiente para o token poder ser guardado com segurança.
          </Alerta>
        )}

        <fieldset className="pagamento-bloco">
          <legend className="pagamento-bloco-titulo">Mercado Pago</legend>
          <p className="texto-pequeno texto-secundario">Recomendado: o Pix é confirmado sozinho, e o plano pode renovar no cartão.</p>
          {mp.conectado && (
            <div className="conta-conectada">
              <CheckCircle2 size={20} aria-hidden="true" />
              <div className="lista-item-principal">
                <p style={{ fontWeight: 700 }}>{mp.vencido ? "Conexão vencida" : "Mercado Pago conectado"}</p>
                {mp.contaDescricao && <p className="texto-secundario texto-pequeno">{mp.contaDescricao}</p>}
              </div>
              <Botao pequeno variante="ghost" onClick={() => setConfirmar("desconectar")}>
                Desconectar
              </Botao>
            </div>
          )}
          {mp.vencido && (
            <Alerta tom="atencao">A conexão com o Mercado Pago venceu. Conecte de novo para voltar a receber por ele.</Alerta>
          )}
          {props.conexaoDisponivel && (!mp.conectado || mp.vencido || mp.porBotao) && (
            <div className="pilha-sm">
              <a href="/api/painel/configuracoes/pagamento/mercadopago" className={`btn ${mpAtivo ? "btn-secondary btn-sm" : "btn-primary"}`}>
                {mpAtivo ? "Trocar de conta" : "Conectar com Mercado Pago"}
              </a>
              {!mpAtivo && (
                <p className="texto-pequeno texto-secundario">
                  Você entra na sua conta do Mercado Pago e autoriza o Barbium. Não precisa copiar nenhum token.
                </p>
              )}
            </div>
          )}
          {props.conexaoDisponivel ? (
            <details className="pagamento-avancado">
              <summary>Usar Access Token (avançado)</summary>
              {campoToken}
            </details>
          ) : (
            campoToken
          )}
        </fieldset>

        <fieldset className="pagamento-bloco">
          <legend className="pagamento-bloco-titulo">Chave Pix (qualquer banco)</legend>
          <p className="texto-pequeno texto-secundario">
            Sem Mercado Pago? O cliente paga pela sua chave Pix e você confirma cada pagamento no Barbium, depois de conferir no
            banco. Com o Mercado Pago conectado, ele é usado no lugar da chave.
          </p>
          {props.chavePix && (
            <div className="conta-conectada">
              <KeyRound size={20} aria-hidden="true" />
              <div className="lista-item-principal">
                <p style={{ fontWeight: 700 }}>
                  {ROTULO_TIPO_CHAVE[props.chavePix.tipo]}:{" "}
                  <span className="num" style={{ whiteSpace: "nowrap" }}>
                    {exibirChave(props.chavePix.tipo, props.chavePix.chave)}
                  </span>
                </p>
                <p className="texto-secundario texto-pequeno">{props.chavePix.cidade}</p>
              </div>
              <Botao pequeno variante="ghost" onClick={() => setConfirmar("remover-chave")}>
                Remover
              </Botao>
            </div>
          )}
          {erroChave && <Alerta tom="perigo">{erroChave}</Alerta>}
          <div className="pagamento-chave-campos">
            <Campo id="pix-tipo" rotulo="Tipo de chave">
              <select {...ariaCampo("pix-tipo", {})} className="input" value={tipoChave} onChange={(e) => setTipoChave(e.target.value as TipoChave)}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO_CHAVE[t]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="pix-chave" rotulo={props.chavePix ? "Trocar a chave" : "Chave Pix"} opcional={Boolean(props.chavePix)}>
              <input
                {...ariaCampo("pix-chave", {})}
                className="input"
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                inputMode={tipoChave === "EMAIL" ? "email" : tipoChave === "ALEATORIA" ? "text" : "numeric"}
              />
            </Campo>
          </div>
          <Campo id="pix-cidade" rotulo="Cidade da barbearia" dica="Vai no código do Pix, como pede o Banco Central.">
            <input {...ariaCampo("pix-cidade", { dica: true })} className="input" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </Campo>
        </fieldset>

        <fieldset className="pagamento-bloco">
          <legend className="pagamento-bloco-titulo">Sinal antecipado</legend>
          <p className="texto-pequeno texto-secundario">
            No agendamento online, o cliente paga parte do valor por Pix. O horário só é confirmado depois do pagamento.
          </p>
          <label className="interruptor">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span className="interruptor-trilho" aria-hidden="true" />
            Cobrar sinal no agendamento online
          </label>
          {ativo && metodoDoSinal && (
            <p className="texto-pequeno texto-secundario">
              {metodoDoSinal === "mercadopago"
                ? "O sinal é cobrado pelo Mercado Pago e confirmado sozinho."
                : "O sinal é pago na sua chave Pix. O cliente avisa que pagou, você recebe um aviso e confirma na agenda."}
            </p>
          )}
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
        </fieldset>

        <div className="form-acoes">
          <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
            Salvar
          </Botao>
        </div>
      </form>

      <DialogoConfirmacao
        aberto={confirmar !== null}
        titulo={confirmar === "desconectar" ? "Desconectar o Mercado Pago?" : "Remover a chave Pix?"}
        descricao={
          confirmar === "desconectar"
            ? props.chavePix
              ? "O token é apagado. O sinal e os planos passam a usar a sua chave Pix."
              : "O token é apagado e o sinal deixa de ser cobrado nos próximos agendamentos."
            : mpAtivo
              ? "A chave deixa de ser usada. O Mercado Pago continua recebendo normalmente."
              : "Sem a chave e sem o Mercado Pago, o sinal deixa de ser cobrado e os planos voltam a ser pagos só no balcão."
        }
        rotuloConfirmar={confirmar === "desconectar" ? "Desconectar" : "Remover chave"}
        textoCarregando={confirmar === "desconectar" ? "Desconectando…" : "Removendo…"}
        perigo
        processando={processandoDialogo}
        erro={erroDialogo}
        aoConfirmar={confirmarDialogo}
        aoCancelar={() => setConfirmar(null)}
      />
    </section>
  );
}
