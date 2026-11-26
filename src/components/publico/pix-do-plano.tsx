"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { formatarMoeda } from "@/lib/formatar";
import { QrPix, formatarContagem } from "./qr-pix";

export interface PixPlanoVM {
  pagamentoId: string;
  valor: number;
  expiraEm: string;
  qrCode: string;
  qrCodeBase64: string | null;
  // Pix pela chave da barbearia: o cliente avisa que pagou e o dono confirma.
  viaChave: boolean;
}

// Miolo da tela do Pix de um mês de plano (assinar pela página de agendamento
// ou renovar em "minha assinatura"). Pelo Mercado Pago, a confirmação chega
// sozinha; pela chave, o cliente toca em "Já fiz o Pix" e espera o dono.
export function PixDoPlano({
  slug,
  pix,
  agora,
  informado,
  aoInformar,
  aoExpirar,
  depoisDePago,
}: {
  slug: string;
  pix: PixPlanoVM;
  agora: number;
  informado: boolean;
  aoInformar: () => void;
  aoExpirar: () => void;
  // Ex.: "o plano passa a valer por 30 dias".
  depoisDePago: string;
}) {
  const [avisando, setAvisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const restanteMs = Date.parse(pix.expiraEm) - agora;

  async function avisar() {
    setAvisando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/publico/${slug}/assinaturas/${pix.pagamentoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "pix-informado" }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        if (resposta.status === 409) aoExpirar();
        else setErro(dados?.erro ?? "Não foi possível avisar a barbearia. Tente de novo.");
        return;
      }
      aoInformar();
    } catch {
      setErro("Falha de conexão. Tente de novo.");
    } finally {
      setAvisando(false);
    }
  }

  return (
    <>
      <p className="num valor-destaque">{formatarMoeda(pix.valor)}</p>
      {pix.viaChave && informado ? (
        <div className="pix-informado" role="status">
          <CheckCircle2 size={22} aria-hidden="true" />
          <p>
            <strong>Pronto, avisamos a barbearia.</strong> Ela vai conferir o Pix e, quando confirmar, {depoisDePago}.
          </p>
        </div>
      ) : (
        <QrPix qrCode={pix.qrCode} qrCodeBase64={pix.qrCodeBase64} alt="QR code do Pix do plano" />
      )}
      {pix.viaChave && !informado && (
        <>
          <p className="texto-pequeno texto-secundario">O Pix vai direto para a conta da barbearia. Depois de pagar, toque abaixo.</p>
          {erro && <Alerta tom="perigo">{erro}</Alerta>}
          <Botao variante="primary" bloco onClick={avisar} carregando={avisando} textoCarregando="Avisando…">
            Já fiz o Pix
          </Botao>
        </>
      )}
      <p className="pix-espera">
        <span className="spinner" aria-hidden="true" />
        <span role="status">
          {pix.viaChave
            ? informado
              ? "Aguardando a barbearia confirmar"
              : "Aguardando você pagar"
            : restanteMs > 0
              ? "Aguardando pagamento"
              : "Conferindo o pagamento…"}
        </span>
        {restanteMs > 0 && !informado && <span className="num">· vale por {formatarContagem(restanteMs)}</span>}
      </p>
      {!pix.viaChave && (
        <p className="texto-pequeno texto-secundario">
          Assim que o pagamento cair, {depoisDePago}.
        </p>
      )}
    </>
  );
}
