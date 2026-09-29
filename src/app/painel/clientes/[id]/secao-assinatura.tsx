"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import {
  statusAssinatura,
  ROTULO_STATUS_ASSINATURA,
  ROTULO_PERIODICIDADE,
  type StatusAssinatura,
} from "@/lib/assinatura";
import { formatarMoeda } from "@/lib/formatar";
import { Badge } from "@/components/ui/badge";
import { Botao } from "@/components/ui/botao";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";

interface Props {
  clienteId: string;
  tipoAtual: "MENSAL" | "TRIMESTRAL" | null;
  valorAtual: number | null;
  vencimentoAtual: string | null; // ISO
}

const TOM: Record<StatusAssinatura, "sucesso" | "atencao" | "neutro"> = {
  ATIVA: "sucesso",
  VENCIDA: "atencao",
  SEM_ASSINATURA: "neutro",
};

// As datas de assinatura são exibidas no fuso do navegador, como sempre foram.
function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SecaoAssinatura({ clienteId, tipoAtual, valorAtual, vencimentoAtual }: Props) {
  const router = useRouter();
  const vencimentoData = vencimentoAtual ? new Date(vencimentoAtual) : null;
  const status = statusAssinatura(vencimentoData);
  const temAssinatura = status !== "SEM_ASSINATURA";

  const [tipo, setTipo] = useState<"MENSAL" | "TRIMESTRAL">(tipoAtual ?? "MENSAL");
  const [valor, setValor] = useState(valorAtual != null ? String(valorAtual) : "");
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [erroValor, setErroValor] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [salvo, setSalvo] = useState<string | null>(null);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);

  async function ativarOuRenovar(evento: FormEvent) {
    evento.preventDefault();
    setSalvo(null);
    setErro(null);
    const numero = Number(valor.replace(",", "."));
    if (!valor || Number.isNaN(numero) || numero < 0) {
      setErroValor("Informe o valor da assinatura.");
      return;
    }
    setErroValor(null);
    setProcessando(true);
    try {
      const resposta = await fetch(`/api/painel/clientes/${clienteId}/assinatura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, valor: numero, dataInicio }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível salvar a assinatura.");
        return;
      }
      setSalvo(temAssinatura ? "Assinatura renovada" : "Assinatura ativada");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  async function cancelar() {
    setProcessando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/painel/clientes/${clienteId}/assinatura`, { method: "DELETE" });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível cancelar a assinatura.");
        return;
      }
      setConfirmarCancelamento(false);
      setSalvo("Assinatura cancelada");
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <section className="card" aria-labelledby="titulo-assinatura">
      <div className="card-cabecalho">
        <h2 id="titulo-assinatura" className="card-titulo">
          Assinatura
        </h2>
        <Badge tom={TOM[status]}>{ROTULO_STATUS_ASSINATURA[status]}</Badge>
      </div>

      <div className="pilha-sm">
        {temAssinatura && tipoAtual && valorAtual != null && vencimentoData && (
          <dl className="fatos">
            <div>
              <dt>Plano</dt>
              <dd>{ROTULO_PERIODICIDADE[tipoAtual]}</dd>
            </div>
            <div>
              <dt>Valor</dt>
              <dd>{formatarMoeda(valorAtual)}</dd>
            </div>
            <div>
              <dt>{status === "VENCIDA" ? "Venceu em" : "Vence em"}</dt>
              <dd>{formatarData(vencimentoData)}</dd>
            </div>
          </dl>
        )}

        {erro && !confirmarCancelamento && <Alerta tom="perigo">{erro}</Alerta>}

        <form onSubmit={ativarOuRenovar} className="form" noValidate>
          <fieldset className="campo" style={{ border: "none", margin: 0, padding: 0 }}>
            <legend className="campo-rotulo" style={{ marginBottom: 8 }}>
              Periodicidade
            </legend>
            <div className="segmentado" role="radiogroup">
              {(["MENSAL", "TRIMESTRAL"] as const).map((opcao) => (
                <label key={opcao} style={{ position: "relative" }}>
                  <input
                    type="radio"
                    name="tipo"
                    value={opcao}
                    checked={tipo === opcao}
                    onChange={() => setTipo(opcao)}
                  />
                  <span className="segmentado-item">{ROTULO_PERIODICIDADE[opcao]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="form-grade form-grade-2">
            <Campo id="valor" rotulo="Valor" erro={erroValor}>
              <div className="input-prefixo">
                <span aria-hidden="true">R$</span>
                <input
                  {...ariaCampo("valor", { erro: erroValor })}
                  className="input num"
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </Campo>
            {!temAssinatura && (
              <Campo id="dataInicio" rotulo="Início">
                <input
                  id="dataInicio"
                  type="date"
                  className="input"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </Campo>
            )}
          </div>

          {temAssinatura && (
            <p className="campo-dica">
              Renovar soma um novo período a partir do vencimento atual — ou de hoje, se já venceu.
            </p>
          )}

          <div className="form-acoes">
            <Botao type="submit" variante="primary" carregando={processando && !confirmarCancelamento} textoCarregando="Salvando…">
              {temAssinatura ? "Renovar assinatura" : "Ativar assinatura"}
            </Botao>
            {temAssinatura && (
              <Botao variante="danger-outline" onClick={() => setConfirmarCancelamento(true)} disabled={processando}>
                Cancelar assinatura
              </Botao>
            )}
            <span role="status" aria-live="polite">
              {salvo && (
                <span className="feedback-salvo">
                  <Check size={16} aria-hidden="true" />
                  {salvo}
                </span>
              )}
            </span>
          </div>
        </form>
      </div>

      <DialogoConfirmacao
        aberto={confirmarCancelamento}
        titulo="Cancelar assinatura?"
        descricao="O cliente deixa de constar como assinante. Você pode ativar uma nova assinatura depois."
        rotuloConfirmar="Cancelar assinatura"
        textoCarregando="Cancelando…"
        perigo
        processando={processando}
        erro={confirmarCancelamento ? erro : null}
        aoConfirmar={cancelar}
        aoCancelar={() => {
          setConfirmarCancelamento(false);
          setErro(null);
        }}
      />
    </section>
  );
}
