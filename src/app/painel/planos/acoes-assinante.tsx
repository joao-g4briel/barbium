"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { Dialogo } from "@/components/ui/dialogo";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { CopiarTexto } from "@/components/ui/copiar-texto";
import { FORMAS_PAGAMENTO, ROTULO_FORMA_PAGAMENTO } from "@/lib/forma-pagamento";
import { formatarMoeda } from "@/lib/formatar";

// Escolha de como o cliente pagou, igual à da conclusão do atendimento.
export function EscolhaForma({
  nome,
  titulo,
  valor,
  onChange,
}: {
  nome: string;
  titulo: string;
  valor: FormaPagamento | null;
  onChange: (forma: FormaPagamento) => void;
}) {
  return (
    <fieldset className="formas-pagamento">
      <legend className="formas-pagamento-titulo">{titulo}</legend>
      <div className="formas-pagamento-opcoes">
        {FORMAS_PAGAMENTO.map((f) => (
          <label key={f} className="forma-opcao">
            <input type="radio" name={nome} value={f} checked={valor === f} onChange={() => onChange(f)} />
            <span>{ROTULO_FORMA_PAGAMENTO[f]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AcoesAssinante({
  assinaturaId,
  cliente,
  plano,
  valor,
  link,
  renovaNoCartao,
}: {
  assinaturaId: string;
  cliente: string;
  plano: string;
  valor: number;
  // Link da "minha assinatura" do cliente, pra mandar a ele (vazio sem APP_URL).
  link: string | null;
  renovaNoCartao: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<"pagamento" | "encerrar" | null>(null);
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setAberto(null);
    setForma(null);
    setErro(null);
  }

  async function enviar(corpo: object) {
    setProcessando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/painel/planos/assinantes/${assinaturaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null);
        setErro(dados?.erro ?? "Não foi possível salvar.");
        return;
      }
      fechar();
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="acoes-linha">
      {!renovaNoCartao && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAberto("pagamento")}>
          Registrar mês pago<span className="sr-only"> de {cliente}</span>
        </button>
      )}
      {link && <CopiarTexto texto={link} rotulo="Copiar link do cliente" mensagemCopiado="Link da assinatura copiado." />}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto("encerrar")}>
        Encerrar<span className="sr-only"> assinatura de {cliente}</span>
      </button>

      <Dialogo
        aberto={aberto === "pagamento"}
        aoFechar={fechar}
        titulo="Registrar mês pago"
        descricao={`${cliente} · plano ${plano}. O plano ganha mais 30 dias e ${formatarMoeda(valor)} entra no caixa.`}
        bloquearFechamento={processando}
        rodape={
          <>
            <Botao onClick={fechar} disabled={processando}>
              Voltar
            </Botao>
            <Botao
              variante="primary"
              onClick={() => forma && enviar({ acao: "pagamento", formaPagamento: forma })}
              disabled={!forma}
              carregando={processando}
              textoCarregando="Salvando…"
            >
              Registrar {formatarMoeda(valor)}
            </Botao>
          </>
        }
      >
        {erro && <Alerta tom="perigo">{erro}</Alerta>}
        <EscolhaForma nome={`forma-${assinaturaId}`} titulo="Como o cliente pagou?" valor={forma} onChange={setForma} />
      </Dialogo>

      <DialogoConfirmacao
        aberto={aberto === "encerrar"}
        titulo="Encerrar assinatura?"
        descricao={`${cliente} deixa de agendar pelo plano ${plano} a partir de agora.${renovaNoCartao ? " A cobrança mensal no cartão também é cancelada." : ""} Horários já marcados pelo plano continuam na agenda. O que já foi pago continua no caixa.`}
        rotuloConfirmar="Encerrar assinatura"
        textoCarregando="Encerrando…"
        perigo
        processando={processando}
        erro={erro}
        aoConfirmar={() => enviar({ acao: "encerrar" })}
        aoCancelar={fechar}
      />
    </div>
  );
}
