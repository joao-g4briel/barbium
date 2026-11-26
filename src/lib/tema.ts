import type { CSSProperties } from "react";
import { COR_PADRAO, ajustarAte, contraste, corValida, ehClaro, misturar, paletaDaMarca } from "./cor-marca";

// Tema da barbearia: cor dos botões (corMarca) e cor de fundo (corFundo). A
// partir das duas, deriva todas as variáveis de cor do app (fundo,
// superfícies, bordas, textos, avisos e marca) com contraste garantido:
// texto ≥ 4,5:1, bordas de campo ≥ 3:1. Fundo claro vira tema claro (texto
// escuro). Vale para o link de agendamento e, se a barbearia quiser, para o
// painel. Usado no servidor e no navegador (prévia nas Configurações).

export const FUNDO_PADRAO = "#0d1110";

export const FUNDOS_SUGERIDOS: { cor: string; nome: string }[] = [
  { cor: FUNDO_PADRAO, nome: "Escuro" },
  { cor: "#121314", nome: "Grafite" },
  { cor: "#0b1220", nome: "Azul-noite" },
  { cor: "#1a0f13", nome: "Vinho" },
  { cor: "#f4f5f3", nome: "Claro" },
  { cor: "#f3eee5", nome: "Areia" },
];

const TINTA_ESCURA = "#111614";
const TINTA_CLARA = "#f4f7f5";

// Avisos (sucesso, atenção, erro, informação) num fundo claro. No escuro
// valem os do globals.css. Vão nas variáveis de base e nas de papel: no
// :root as de papel se recalculam, mas num elemento (a prévia) não.
const AVISOS_CLARO: Record<string, string> = {
  "--success-fg": "#047857",
  "--success-bg": "#d1fae5",
  "--warning-fg": "#92400e",
  "--warning-bg": "#fef3c7",
  "--error-fg": "#b91c1c",
  "--error-bg": "#fee2e2",
  "--info-fg": "#1d4ed8",
  "--info-bg": "#dbeafe",
  "--color-success": "#047857",
  "--color-success-soft": "#d1fae5",
  "--color-success-surface": "#d1fae5",
  "--color-success-border": "#6ee7b7",
  "--color-warning": "#92400e",
  "--color-warning-soft": "#fef3c7",
  "--color-warning-surface": "#fef3c7",
  "--color-warning-border": "#fcd34d",
  "--color-danger": "#b91c1c",
  "--color-danger-soft": "#fee2e2",
  "--color-danger-border": "#fca5a5",
  "--color-danger-hover": "#991b1b",
  "--color-on-danger": "#ffffff",
  "--color-info": "#1d4ed8",
  "--color-info-soft": "#dbeafe",
  "--color-info-surface": "#dbeafe",
  "--color-info-border": "#93c5fd",
};

export interface CoresTema {
  corMarca: string | null | undefined;
  corFundo: string | null | undefined;
}

export interface PaletaNeutra {
  claro: boolean;
  fundo: string;
  superficie: string;
  elevada: string;
  elevadaHover: string;
  campo: string;
  bordaSutil: string;
  bordaForte: string;
  bordaCampo: string;
  texto: string;
  textoSecundario: string;
  textoApagado: string;
}

// Cor de tom médio (cinza, amarelo-escuro…) não deixa texto legível nem
// claro nem escuro: o fundo é escurecido (ou clareado) até o texto ficar com
// folga. O padrão do Barbium tem ~17:1; 12:1 deixa espaço pras superfícies.
const CONTRASTE_FUNDO = 12;

export function fundoAjustado(fundoBruto: string): string {
  const original = fundoBruto.toLowerCase();
  const claro = ehClaro(original);
  const tinta = claro ? TINTA_ESCURA : TINTA_CLARA;
  const alvo = claro ? "#ffffff" : "#000000";
  for (let t = 0; t <= 1.0001; t += 0.04) {
    const c = misturar(original, alvo, Math.min(1, t));
    if (contraste(tinta, c) >= CONTRASTE_FUNDO) return c;
  }
  return alvo;
}

export function paletaNeutra(fundoBruto: string): PaletaNeutra {
  const fundo = fundoAjustado(fundoBruto);
  const claro = ehClaro(fundo);
  const tinta = claro ? TINTA_ESCURA : TINTA_CLARA;
  // No claro, os cartões ficam mais claros que o fundo; no escuro, um pouco
  // mais claros também (luz vinda de cima).
  const superficie = claro ? misturar(fundo, "#ffffff", 0.75) : misturar(fundo, tinta, 0.07);
  const elevada = misturar(fundo, tinta, claro ? 0.04 : 0.1);
  const elevadaHover = misturar(fundo, tinta, claro ? 0.08 : 0.14);
  const campo = claro ? misturar(fundo, "#ffffff", 0.85) : misturar(fundo, tinta, 0.03);
  const bordaSutil = misturar(fundo, tinta, claro ? 0.12 : 0.15);
  const bordaForte = misturar(fundo, tinta, claro ? 0.2 : 0.22);
  // Borda de campo precisa aparecer (≥ 3:1) sobre o fundo e sobre o cartão.
  const bordaCampo = ajustarAte(ajustarAte(misturar(fundo, tinta, claro ? 0.4 : 0.35), superficie, 3), fundo, 3);
  // Textos secundários: ≥ 4,5:1 até sobre a superfície mais "pesada".
  const textoSecundario = ajustarAte(misturar(tinta, fundo, 0.3), elevadaHover, 4.5);
  const textoApagado = ajustarAte(misturar(tinta, fundo, 0.38), elevadaHover, 4.5);
  return {
    claro,
    fundo,
    superficie,
    elevada,
    elevadaHover,
    campo,
    bordaSutil,
    bordaForte,
    bordaCampo,
    texto: tinta,
    textoSecundario,
    textoApagado,
  };
}

// Variáveis CSS do tema, ou null quando a barbearia usa o padrão.
export function variaveisDoTema({ corMarca, corFundo }: CoresTema): Record<string, string> | null {
  const temFundo = corValida(corFundo) && corFundo.toLowerCase() !== FUNDO_PADRAO;
  const temMarca = corValida(corMarca);
  if (!temFundo && !temMarca) return null;

  const vars: Record<string, string> = {};
  let base: { fundo: string; superficie: string } | undefined;

  if (temFundo) {
    const n = paletaNeutra(corFundo);
    base = { fundo: n.fundo, superficie: n.superficie };
    Object.assign(vars, {
      "color-scheme": n.claro ? "light" : "dark",
      "--bg-page": n.fundo,
      "--bg-surface": n.superficie,
      "--bg-surface-raised": n.elevada,
      "--bg-input": n.campo,
      "--text-primary": n.texto,
      "--text-secondary": n.textoSecundario,
      "--text-muted": n.textoApagado,
      "--border-subtle": n.bordaSutil,
      "--border-control": n.bordaCampo,
      // Papéis (ver globals.css): definidos direto pra valer também na prévia.
      "--color-bg": n.fundo,
      "--color-surface": n.superficie,
      "--color-card": n.superficie,
      "--color-card-hover": n.elevada,
      "--color-raised": n.elevada,
      "--color-raised-hover": n.elevadaHover,
      "--color-input": n.campo,
      "--color-border": n.bordaSutil,
      "--color-border-strong": n.bordaForte,
      "--color-border-control": n.bordaCampo,
      "--color-text": n.texto,
      "--color-text-muted": n.textoSecundario,
      "--color-text-subtle": n.textoApagado,
      "--color-neutral-soft": n.elevada,
      "--color-neutral-border": n.bordaForte,
      "--color-on-accent": n.fundo,
      "--color-overlay": n.claro ? "rgba(17, 22, 20, 0.45)" : "rgba(0, 0, 0, 0.72)",
      ...(n.claro ? AVISOS_CLARO : {}),
    });
  }

  // Marca sobre o fundo escolhido (sem cor própria, o verde do Barbium
  // ajustado para esse fundo).
  const marca = paletaDaMarca(temMarca ? corMarca : COR_PADRAO, base)!;
  Object.assign(vars, {
    "--color-primary": marca.primaria,
    "--color-primary-hover": marca.primariaHover,
    "--color-primary-press": marca.primariaPress,
    "--color-on-primary": marca.sobrePrimaria,
    "--color-accent": marca.destaque,
    "--color-accent-text": marca.destaqueTexto,
    "--color-selected": marca.selecionado,
    "--color-selected-border": marca.destaque,
    "--color-focus": marca.destaqueTexto,
  });
  return vars;
}

// Regra pra pôr na página (<style>): vale pra tudo, inclusive janelas e o
// fundo atrás do conteúdo. Os valores são cores #rrggbb já validadas.
export function cssDoTema(cores: CoresTema): string | null {
  const vars = variaveisDoTema(cores);
  if (!vars) return null;
  const corpo = Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `:root{${corpo}}`;
}

// Mesmas variáveis num elemento (a prévia nas Configurações).
export function estiloDoTema(cores: CoresTema): CSSProperties | undefined {
  const vars = variaveisDoTema(cores);
  if (!vars) return undefined;
  const { "color-scheme": esquema, ...resto } = vars;
  return { ...resto, ...(esquema ? { colorScheme: esquema } : {}) } as CSSProperties;
}
