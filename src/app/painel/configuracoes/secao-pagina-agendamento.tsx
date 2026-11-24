"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, ImagePlus, MapPin, Trash2 } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { Alerta } from "@/components/ui/alerta";
import { Campo, ariaCampo } from "@/components/ui/campo";
import { COR_PADRAO, CORES_SUGERIDAS, corValida, estiloDaMarca } from "@/lib/cor-marca";
import { iniciais } from "@/lib/formatar";

const LADO_MAXIMO = 512;
const BYTES_MAXIMO = 200 * 1024;

// Reduz a imagem no navegador (até 512px no maior lado) antes de enviar.
async function reduzirImagem(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("imagem inválida"));
      i.src = url;
    });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const qualidade of [0.9, 0.8, 0.65, 0.5]) {
      const dataUrl = canvas.toDataURL("image/webp", qualidade);
      // Navegador sem WebP devolve PNG: aceita do mesmo jeito.
      if (dataUrl.length * 0.75 <= BYTES_MAXIMO) return dataUrl;
    }
    throw new Error("grande demais");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SecaoPaginaAgendamento({
  nome,
  slug,
  enderecoInicial,
  corInicial,
  logoUrl,
}: {
  nome: string;
  slug: string;
  enderecoInicial: string;
  corInicial: string | null;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const [endereco, setEndereco] = useState(enderecoInicial);
  const [cor, setCor] = useState<string>(corInicial ?? COR_PADRAO);
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
        body: JSON.stringify({ endereco: endereco.trim() || null, corMarca: cor === COR_PADRAO ? null : cor }),
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
      } catch {
        setErro("Não deu para usar essa imagem. Tente um PNG ou JPG.");
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
          <p className="card-descricao">Logo, cor e endereço que os clientes veem no link de agendamento.</p>
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
              <input ref={entradaArquivo} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={escolherLogo} tabIndex={-1} />
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

        <div className="pagina-previa" style={estiloDaMarca(cor)} aria-label="Prévia da página de agendamento">
          <p className="pagina-previa-rotulo">Prévia</p>
          <div className="pagina-previa-corpo">
            <p className="pagina-previa-nome">{nome}</p>
            {endereco.trim() && (
              <p className="pagina-previa-endereco">
                <MapPin size={14} aria-hidden="true" />
                {endereco.trim()}
              </p>
            )}
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
