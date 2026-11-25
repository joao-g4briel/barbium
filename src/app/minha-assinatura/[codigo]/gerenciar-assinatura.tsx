"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, CalendarPlus, CreditCard, MessageCircle, QrCode } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { DialogoConfirmacao } from "@/components/ui/dialogo-confirmacao";
import { QrPix, formatarContagem } from "@/components/publico/qr-pix";
import { useFuso } from "@/components/fuso-contexto";
import { formatarDataInstante, formatarMoeda } from "@/lib/formatar";
import { ROTULO_SITUACAO_ASSINATURA, descreverUsos, type SituacaoAssinatura } from "@/lib/planos-corte-regras";

interface AssinaturaVM {
  plano: string;
  valor: number;
  planoAVenda: boolean;
  usosPorMes: number | null;
  servicos: string[];
  situacao: SituacaoAssinatura;
  validaAte: string | null;
  usados: number | null;
  // Do Mercado Pago: pending, authorized, paused, cancelled; vazio sem cartão.
  cartaoStatus: string | null;
}

interface PixVM {
  pagamentoId: string;
  valor: number;
  expiraEm: string;
  qrCode: string;
  qrCodeBase64: string | null;
}

const INTERVALO_CONSULTA_MS = 5000;

export function GerenciarAssinatura({
  codigo,
  slug,
  voltandoDoCartao,
  assinatura: a,
  pixOnline,
  whatsappBarbearia,
}: {
  codigo: string;
  slug: string;
  voltandoDoCartao: boolean;
  assinatura: AssinaturaVM;
  pixOnline: boolean;
  whatsappBarbearia: string | null;
}) {
  const fuso = useFuso();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [pix, setPix] = useState<PixVM | null>(null);
  const [pixExpirado, setPixExpirado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  const data = (iso: string) => formatarDataInstante(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric" }, fuso);
  const renovaNoCartao = a.cartaoStatus === "authorized";
  const cartaoPendente = a.cartaoStatus === "pending";
  const ativa = a.situacao === "ATIVA";

  // Voltou do Mercado Pago e a primeira cobrança ainda não apareceu: confere
  // de novo em instantes (a página consulta o Mercado Pago a cada carga).
  useEffect(() => {
    if (!voltandoDoCartao || ativa) return;
    const id = setTimeout(() => router.refresh(), 8000);
    return () => clearTimeout(id);
  }, [voltandoDoCartao, ativa, router]);

  useEffect(() => {
    if (!pix || pixExpirado) return;
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    let vivo = true;
    const consulta = setInterval(async () => {
      try {
        const resposta = await fetch(`/api/publico/${slug}/assinaturas/${pix.pagamentoId}`, { cache: "no-store" });
        if (!resposta.ok || !vivo) return;
        const dados = await resposta.json();
        if (dados.status === "PAGO") {
          setPix(null);
          router.refresh();
        } else if (dados.status === "EXPIRADO") setPixExpirado(true);
      } catch {
        // Sem conexão agora: tenta na próxima rodada.
      }
    }, INTERVALO_CONSULTA_MS);
    return () => {
      vivo = false;
      clearInterval(relogio);
      clearInterval(consulta);
    };
  }, [pix, pixExpirado, slug, router]);

  async function agir(acao: "cancelar-renovacao" | "renovar-pix") {
    setProcessando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/publico/minha-assinatura/${codigo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível concluir agora.");
        return;
      }
      if (acao === "renovar-pix") {
        setAgora(Date.now());
        setPixExpirado(false);
        setPix(dados.pagamento);
      } else {
        setConfirmarCancelamento(false);
        router.refresh();
      }
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  if (pix) {
    const restanteMs = Date.parse(pix.expiraEm) - agora;
    return (
      <section className="card confirmacao" aria-labelledby="titulo-pix-renovacao">
        <h2 id="titulo-pix-renovacao" className="etapa-titulo">
          {pixExpirado ? "O prazo do Pix acabou" : `Renovar ${a.plano}`}
        </h2>
        {pixExpirado ? (
          <>
            <p className="texto-secundario">Se você chegou a pagar, fale com a barbearia. Se não, gere outro Pix.</p>
            {erro && <Alerta tom="perigo">{erro}</Alerta>}
            <Botao variante="primary" carregando={processando} textoCarregando="Gerando Pix…" onClick={() => agir("renovar-pix")}>
              Gerar outro Pix
            </Botao>
          </>
        ) : (
          <>
            <p className="num valor-destaque">{formatarMoeda(pix.valor)}</p>
            <QrPix qrCode={pix.qrCode} qrCodeBase64={pix.qrCodeBase64} alt="QR code do Pix da renovação" />
            <p className="pix-espera">
              <span className="spinner" aria-hidden="true" />
              <span role="status">{restanteMs > 0 ? "Aguardando pagamento" : "Conferindo o pagamento…"}</span>
              {restanteMs > 0 && <span className="num">· vale por {formatarContagem(restanteMs)}</span>}
            </p>
            <p className="texto-pequeno texto-secundario">Assim que o pagamento cair, o plano ganha mais 30 dias.</p>
          </>
        )}
      </section>
    );
  }

  return (
    <div className="pilha">
      {voltandoDoCartao && ativa && renovaNoCartao && (
        <Alerta tom="sucesso">Assinatura no cartão confirmada. O plano renova sozinho todo mês.</Alerta>
      )}
      {voltandoDoCartao && !ativa && (
        <Alerta tom="info">
          {cartaoPendente
            ? "Ainda não recebemos a confirmação do cartão. Se você concluiu o pagamento, esta página atualiza sozinha em instantes."
            : "Conferindo o pagamento no cartão… esta página atualiza sozinha em instantes."}
        </Alerta>
      )}

      <section className="card plano-publico" aria-labelledby="titulo-assinatura">
        <div className="plano-publico-topo">
          <h2 id="titulo-assinatura" className="plano-publico-nome">
            {a.plano}
          </h2>
          <span className="badge" data-tom={ativa ? "sucesso" : a.situacao === "VENCIDA" ? "perigo" : "atencao"}>
            {ROTULO_SITUACAO_ASSINATURA[a.situacao]}
          </span>
        </div>
        <dl className="fatos">
          <div>
            <dt>Vale até</dt>
            <dd className="num">{a.validaAte ? data(a.validaAte) : "Primeiro mês não pago"}</dd>
          </div>
          <div>
            <dt>Pagamento</dt>
            <dd>
              {renovaNoCartao
                ? `Cartão · ${formatarMoeda(a.valor)} todo mês, renova sozinho`
                : a.cartaoStatus === "cancelled"
                  ? "Cartão · renovação automática cancelada"
                  : `Pix · ${formatarMoeda(a.valor)} por mês, você renova`}
            </dd>
          </div>
          <div>
            <dt>Inclui</dt>
            <dd>
              {a.servicos.join(", ")} · {descreverUsos(a.usosPorMes).toLowerCase()}
            </dd>
          </div>
          {a.usados !== null && a.usosPorMes !== null && (
            <div>
              <dt>Usados neste mês</dt>
              <dd className="num">
                {a.usados} de {a.usosPorMes}
              </dd>
            </div>
          )}
        </dl>
        {erro && <Alerta tom="perigo">{erro}</Alerta>}

        <div className="pilha-acoes">
          {ativa && (
            <Link href={`/agendar/${slug}`} className="btn btn-primary btn-bloco">
              <CalendarPlus size={18} aria-hidden="true" />
              Agendar pelo plano
            </Link>
          )}
          {!renovaNoCartao && pixOnline && a.planoAVenda && a.situacao !== "CANCELADA" && (
            <Botao
              variante={ativa ? "secondary" : "primary"}
              bloco
              icone={<QrCode size={18} aria-hidden="true" />}
              carregando={processando}
              textoCarregando="Gerando Pix…"
              onClick={() => agir("renovar-pix")}
            >
              {ativa ? `Renovar antes, no Pix (${formatarMoeda(a.valor)})` : `Renovar no Pix por ${formatarMoeda(a.valor)}`}
            </Botao>
          )}
          {renovaNoCartao && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmarCancelamento(true)}>
              <CreditCard size={16} aria-hidden="true" />
              Cancelar renovação automática
            </button>
          )}
          {a.situacao === "CANCELADA" && whatsappBarbearia && (
            <a href={whatsappBarbearia} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-bloco">
              <MessageCircle size={18} aria-hidden="true" />
              Falar com a barbearia
            </a>
          )}
        </div>

        <p className="texto-pequeno texto-secundario">
          {renovaNoCartao ? (
            <>Ao cancelar a renovação, o plano continua valendo até o fim do mês já pago e não é cobrado de novo.</>
          ) : a.situacao === "CANCELADA" ? (
            <>Esta assinatura foi encerrada pela barbearia.</>
          ) : (
            <>
              <BadgeCheck size={14} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              No Pix, o plano não renova sozinho: se não renovar, ele simplesmente vence. Não há nada para cancelar.
            </>
          )}
        </p>
      </section>

      <p className="texto-pequeno texto-secundario">Guarde este link: é por ele que você vê e renova a sua assinatura.</p>

      <DialogoConfirmacao
        aberto={confirmarCancelamento}
        titulo="Cancelar a renovação automática?"
        descricao={`O cartão não será mais cobrado. O plano ${a.plano} continua valendo${a.validaAte ? ` até ${data(a.validaAte)}` : ""}.`}
        rotuloConfirmar="Cancelar renovação"
        textoCarregando="Cancelando…"
        perigo
        processando={processando}
        erro={erro}
        aoConfirmar={() => agir("cancelar-renovacao")}
        aoCancelar={() => {
          setConfirmarCancelamento(false);
          setErro(null);
        }}
      />
    </div>
  );
}
