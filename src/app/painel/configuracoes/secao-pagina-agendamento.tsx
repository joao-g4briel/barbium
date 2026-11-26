"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, ImagePlus, MapPin, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { COR_PADRAO, CORES_SUGERIDAS, corValida, ehClaro } from "@/lib/cor-marca";
import { FUNDO_PADRAO, FUNDOS_SUGERIDOS, estiloDoTema } from "@/lib/tema";
import { iniciais } from "@/lib/formatar";
import { ANTECEDENCIA_OPCOES, DIAS_A_FRENTE_OPCOES, MENSAGEM_AGENDAMENTO_MAXIMO } from "@/lib/pagina-agendamento";

interface RegrasPagina {
  mensagem: string;
  mostrarPrecos: boolean;
  antecedenciaMinimaMin: number;
  diasAFrente: number;
}

const BYTES_MAXIMO = 200 * 1024;
// Maior lado da imagem enviada; se não couber em 200 KB, tenta menor.
const LADOS = [512, 384, 256];

class ErroImagem extends Error {
  constructor(readonly motivo: "abrir" | "tamanho") {
    super(motivo);
  }
}

const cabe = (dataUrl: string) => dataUrl.length * 0.75 <= BYTES_MAXIMO;

// Reduz a imagem no navegador antes de enviar. O Safari (iPhone) não gera
// WebP pelo canvas e devolve PNG no lugar; PNG de foto passa fácil de 200 KB,
// então: WebP quando o navegador gera de verdade; senão PNG (mantém o fundo
// transparente do logo), diminuindo o lado; por último, JPEG sobre branco.
async function reduzirImagem(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new ErroImagem("abrir"));
      i.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new ErroImagem("abrir");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ErroImagem("abrir");
    const desenhar = (lado: number, fundoBranco = false) => {
      const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (fundoBranco) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    for (const lado of LADOS) {
      desenhar(lado);
      const webp = canvas.toDataURL("image/webp", 0.9);
      if (webp.startsWith("data:image/webp")) {
        for (const qualidade of [0.9, 0.8, 0.65, 0.5]) {
          const dataUrl = qualidade === 0.9 ? webp : canvas.toDataURL("image/webp", qualidade);
          if (cabe(dataUrl)) return dataUrl;
        }
      } else {
        const png = canvas.toDataURL("image/png");
        if (cabe(png)) return png;
      }
    }
    for (const lado of LADOS) {
      desenhar(lado, true);
      for (const qualidade of [0.85, 0.7, 0.55]) {
        const jpeg = canvas.toDataURL("image/jpeg", qualidade);
        if (cabe(jpeg)) return jpeg;
      }
    }
    throw new ErroImagem("tamanho");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SecaoPaginaAgendamento({
  nome,
  slug,
  enderecoInicial,
  corInicial,
  fundoInicial,
  temaNoPainelInicial,
  regrasIniciais,
  logoUrl,
}: {
  nome: string;
  slug: string;
  enderecoInicial: string;
  corInicial: string | null;
  fundoInicial: string | null;
  temaNoPainelInicial: boolean;
  regrasIniciais: RegrasPagina;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const [endereco, setEndereco] = useState(enderecoInicial);
  const [cor, setCor] = useState<string>(corInicial ?? COR_PADRAO);
  const [regras, setRegras] = useState<RegrasPagina>(regrasIniciais);
  const [fundo, setFundo] = useState<string>(fundoInicial ?? FUNDO_PADRAO);
  const [temaNoPainel, setTemaNoPainel] = useState(temaNoPainelInicial);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      const resposta = await fetch("/api/painel/barbearia/pagina", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endereco: endereco.trim() || null,
          corMarca: cor === COR_PADRAO ? null : cor,
          corFundo: fundo === FUNDO_PADRAO ? null : fundo,
          temaNoPainel,
          mensagemAgendamento: regras.mensagem.trim() || null,
          mostrarPrecos: regras.mostrarPrecos,
          antecedenciaMinimaMin: regras.antecedenciaMinimaMin,
          diasAFrente: regras.diasAFrente,
        }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível salvar.");
        return;
      }
      setSalvo(true);
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function escolherLogo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setEnviandoLogo(true);
    try {
      let dataUrl: string;
      try {
        dataUrl = await reduzirImagem(arquivo);
      } catch (e) {
        setErro(
          e instanceof ErroImagem && e.motivo === "tamanho"
            ? "Essa imagem ficou grande demais mesmo reduzida. Tente outra."
            : "Não deu para abrir essa imagem. Se for uma foto HEIC, salve como JPG (ou tire um print dela) e envie de novo.",
        );
        return;
      }
      const resposta = await fetch("/api/painel/barbearia/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(dados?.erro ?? "Não foi possível enviar o logo.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function removerLogo() {
    setErro(null);
    setEnviandoLogo(true);
    try {
      const resposta = await fetch("/api/painel/barbearia/logo", { method: "DELETE" });
      if (!resposta.ok) setErro("Não foi possível remover o logo.");
      else router.refresh();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
    } finally {
      setEnviandoLogo(false);
    }
  }

  return (
    <section className="card" aria-labelledby="titulo-pagina-agendamento">
      <div className="card-cabecalho">
        <div>
          <h2 id="titulo-pagina-agendamento" className="card-titulo">
            Página de agendamento
          </h2>
          <p className="card-descricao">Logo, cor, endereço, recado e regras do link de agendamento.</p>
        </div>
        <a href={`/agendar/${slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          <ExternalLink size={16} aria-hidden="true" />
          Ver página
        </a>
      </div>

      <form className="form" onSubmit={salvar} noValidate>
        <div className="campo">
          <span className="campo-rotulo">Logo</span>
          <div className="pagina-logo">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="publico-logo" src={logoUrl} alt={`Logo da ${nome}`} width={64} height={64} />
            ) : (
              <span className="publico-logo publico-logo-iniciais" aria-hidden="true">
                {iniciais(nome)}
              </span>
            )}
            <div className="form-acoes">
              {/* image/* abre a galeria e a câmera no celular; qualquer formato que o
                  navegador abra é convertido antes do envio. */}
              <input ref={entradaArquivo} type="file" accept="image/*" className="sr-only" onChange={escolherLogo} tabIndex={-1} />
              <Botao pequeno onClick={() => entradaArquivo.current?.click()} carregando={enviandoLogo} textoCarregando="Enviando…">
                <ImagePlus size={16} aria-hidden="true" />
                {logoUrl ? "Trocar logo" : "Enviar logo"}
              </Botao>
              {logoUrl && (
                <Botao pequeno variante="ghost" onClick={removerLogo} disabled={enviandoLogo}>
                  <Trash2 size={16} aria-hidden="true" />
                  Remover
                </Botao>
              )}
            </div>
          </div>
          <p className="campo-dica">PNG, JPG ou WebP. Fica melhor quadrado; a imagem é reduzida antes de enviar.</p>
        </div>

        <fieldset className="campo pagina-cores">
          <legend className="campo-rotulo">Cor da marca</legend>
          <div className="pagina-cores-opcoes" role="radiogroup" aria-label="Cores sugeridas">
            {CORES_SUGERIDAS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cor === c}
                aria-label={c === COR_PADRAO ? "Verde do Barbium (padrão)" : `Cor ${c}`}
                className="pagina-cor"
                style={{ background: c }}
                onClick={() => setCor(c)}
              >
                {cor === c && <Check size={16} strokeWidth={3} aria-hidden="true" />}
              </button>
            ))}
            <label className="pagina-cor-livre">
              <input type="color" value={corValida(cor) ? cor : COR_PADRAO} onChange={(e) => setCor(e.target.value)} />
              Outra cor
            </label>
          </div>
          <p className="campo-dica">Os botões e o horário escolhido usam essa cor. O contraste é ajustado para ficar legível.</p>
        </fieldset>

        <fieldset className="campo pagina-cores">
          <legend className="campo-rotulo">Cor de fundo</legend>
          <div className="pagina-cores-opcoes" role="radiogroup" aria-label="Fundos sugeridos">
            {FUNDOS_SUGERIDOS.map((f) => (
              <button
                key={f.cor}
                type="button"
                role="radio"
                aria-checked={fundo === f.cor}
                aria-label={f.cor === FUNDO_PADRAO ? `${f.nome} (padrão)` : f.nome}
                title={f.nome}
                className="pagina-cor pagina-fundo"
                style={{ background: f.cor, color: ehClaro(f.cor) ? "#111614" : "#ffffff" }}
                onClick={() => setFundo(f.cor)}
              >
                {fundo === f.cor && <Check size={16} strokeWidth={3} aria-hidden="true" />}
              </button>
            ))}
            <label className="pagina-cor-livre">
              <input type="color" value={corValida(fundo) ? fundo : FUNDO_PADRAO} onChange={(e) => setFundo(e.target.value)} />
              Outra cor
            </label>
          </div>
          <p className="campo-dica">
            Fundo claro deixa a página clara, com texto escuro. Cores de tom médio são escurecidas ou clareadas para o texto
            ficar legível.
          </p>
        </fieldset>

        <label className="checkbox">
          <input type="checkbox" checked={temaNoPainel} onChange={(e) => setTemaNoPainel(e.target.checked)} />
          <span className="checkbox-texto">
            <span className="checkbox-rotulo">Usar estas cores também no painel</span>
            <span className="campo-dica">O painel da equipe fica com a cor dos botões e o fundo da barbearia.</span>
          </span>
        </label>

        <Campo id="pagina-endereco" rotulo="Endereço" dica="Rua, número, bairro e cidade. O cliente vê o botão Como chegar." opcional>
          <input
            {...ariaCampo("pagina-endereco", { dica: true })}
            className="input"
            value={endereco}
            maxLength={200}
            placeholder="Rua das Flores, 120, Centro, Recife/PE"
            onChange={(e) => setEndereco(e.target.value)}
          />
        </Campo>

        <div className="form-secao">
          <h3 className="form-secao-titulo">Recado e regras do link</h3>
          <Campo
            id="pagina-mensagem"
            rotulo="Recado no topo da página"
            dica={`Ex.: "Chegue 5 minutos antes" ou "Aceitamos Pix e cartão". Até ${MENSAGEM_AGENDAMENTO_MAXIMO} caracteres.`}
            opcional
          >
            <textarea
              {...ariaCampo("pagina-mensagem", { dica: true })}
              className="input"
              rows={2}
              maxLength={MENSAGEM_AGENDAMENTO_MAXIMO}
              value={regras.mensagem}
              onChange={(e) => setRegras((r) => ({ ...r, mensagem: e.target.value }))}
            />
          </Campo>
          <div className="form-grade form-grade-2">
            <Campo id="pagina-antecedencia" rotulo="Antecedência mínima" dica="Quanto antes o cliente precisa marcar.">
              <select
                {...ariaCampo("pagina-antecedencia", { dica: true })}
                className="input"
                value={regras.antecedenciaMinimaMin}
                onChange={(e) => setRegras((r) => ({ ...r, antecedenciaMinimaMin: Number(e.target.value) }))}
              >
                {ANTECEDENCIA_OPCOES.map((o) => (
                  <option key={o.minutos} value={o.minutos}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="pagina-dias" rotulo="Agendar até" dica="Até quantos dias à frente o cliente pode marcar.">
              <select
                {...ariaCampo("pagina-dias", { dica: true })}
                className="input"
                value={regras.diasAFrente}
                onChange={(e) => setRegras((r) => ({ ...r, diasAFrente: Number(e.target.value) }))}
              >
                {DIAS_A_FRENTE_OPCOES.map((o) => (
                  <option key={o.dias} value={o.dias}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={regras.mostrarPrecos}
              onChange={(e) => setRegras((r) => ({ ...r, mostrarPrecos: e.target.checked }))}
            />
            <span className="checkbox-texto">
              <span className="checkbox-rotulo">Mostrar os preços dos serviços</span>
              <span className="campo-dica">Desligado, o cliente escolhe o serviço sem ver o valor. Planos e sinal continuam com valor.</span>
            </span>
          </label>
          <p className="campo-dica">As regras valem para o link e para o cliente remarcar. No painel, a equipe marca a qualquer hora.</p>
        </div>

        <div
          className="pagina-previa"
          style={estiloDoTema({ corMarca: cor === COR_PADRAO ? null : cor, corFundo: fundo === FUNDO_PADRAO ? null : fundo })}
          aria-label="Prévia da página de agendamento"
        >
          <p className="pagina-previa-rotulo">Prévia</p>
          <div className="pagina-previa-corpo">
            <p className="pagina-previa-nome">{nome}</p>
            {endereco.trim() && (
              <p className="pagina-previa-endereco">
                <MapPin size={14} aria-hidden="true" />
                {endereco.trim()}
              </p>
            )}
            <div className="opcao pagina-previa-servico" aria-hidden="true">
              <span className="opcao-texto">
                <span className="opcao-titulo">Corte</span>
                <span className="opcao-sub">30 min</span>
              </span>
              {regras.mostrarPrecos && <span className="opcao-valor">R$ 30,00</span>}
            </div>
            <div className="horarios pagina-previa-horarios" aria-hidden="true">
              <span className="horario">13:40</span>
              <span className="horario" data-escolhido>
                14:00
              </span>
              <span className="horario">14:40</span>
            </div>
            <span className="btn btn-primary btn-sm" aria-hidden="true">
              Confirmar horário
            </span>
          </div>
        </div>

        {erro && <Alerta tom="perigo">{erro}</Alerta>}
        <div className="form-acoes">
          <Botao type="submit" variante="primary" carregando={salvando} textoCarregando="Salvando…">
            Salvar página
          </Botao>
          {salvo && (
            <span className="feedback-salvo" role="status">
              <Check size={16} aria-hidden="true" />
              Salvo
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
