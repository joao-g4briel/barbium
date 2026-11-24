import type { CSSProperties } from "react";

// Cor da marca da barbearia na página de agendamento. A partir de uma cor
// qualquer (#rrggbb), deriva os papéis do tema escuro com contraste garantido
// (WCAG): botão e texto do botão ≥ 4,5:1, links ≥ 4,5:1 sobre a superfície,
// bordas e progresso ≥ 3:1 sobre o fundo. Usado no servidor e no navegador.

export const COR_PADRAO = "#047857";
export const CORES_SUGERIDAS = ["#047857", "#1d4ed8", "#b91c1c", "#c2410c", "#a16207", "#7c3aed", "#0f766e", "#be185d"];

const FUNDO = "#0d1110";
const SUPERFICIE = "#18231c";
const BRANCO = "#ffffff";

export function corValida(cor: unknown): cor is string {
  return typeof cor === "string" && /^#[0-9a-f]{6}$/i.test(cor);
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hexDe([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
}
function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
// Mistura `a` com `b` (t = 0 → a, t = 1 → b).
function misturar(a: string, b: string, t: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return hexDe([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
// Clareia até atingir o contraste pedido contra `sobre`.
function clarearAte(cor: string, sobre: string, minimo: number): string {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = misturar(cor, BRANCO, Math.min(1, t));
    if (contraste(c, sobre) >= minimo) return c;
  }
  return BRANCO;
}

export interface PaletaMarca {
  primaria: string;
  primariaHover: string;
  primariaPress: string;
  sobrePrimaria: string;
  destaque: string;
  destaqueTexto: string;
  selecionado: string;
}

export function paletaDaMarca(corBruta: string | null | undefined): PaletaMarca | null {
  if (!corValida(corBruta)) return null;
  const cor = corBruta.toLowerCase();
  // Botão: escolhe o texto (branco ou escuro) com mais contraste; se nenhum
  // chega a 4,5:1, ajusta a própria cor até chegar.
  let primaria = cor;
  const sobrePrimaria = contraste(BRANCO, cor) >= contraste(FUNDO, cor) ? BRANCO : FUNDO;
  for (let i = 0; i < 20 && contraste(sobrePrimaria, primaria) < 4.5; i++) {
    primaria = misturar(primaria, sobrePrimaria === BRANCO ? "#000000" : BRANCO, 0.06);
  }
  const escurecer = sobrePrimaria === BRANCO;
  const primariaHover = misturar(primaria, escurecer ? "#000000" : BRANCO, 0.12);
  const primariaPress = misturar(primaria, escurecer ? "#000000" : BRANCO, 0.22);
  const destaque = clarearAte(cor, FUNDO, 3);
  const selecionado = misturar(FUNDO, cor, 0.28);
  // O texto de destaque aparece sobre a superfície e sobre a seleção.
  const destaqueTexto = clarearAte(clarearAte(cor, SUPERFICIE, 4.5), selecionado, 4.5);
  return { primaria, primariaHover, primariaPress, sobrePrimaria, destaque, destaqueTexto, selecionado };
}

// Variáveis CSS que trocam os papéis de marca dentro da página pública.
export function estiloDaMarca(cor: string | null | undefined): CSSProperties | undefined {
  const p = paletaDaMarca(cor);
  if (!p) return undefined;
  return {
    "--color-primary": p.primaria,
    "--color-primary-hover": p.primariaHover,
    "--color-primary-press": p.primariaPress,
    "--color-on-primary": p.sobrePrimaria,
    "--color-accent": p.destaque,
    "--color-accent-text": p.destaqueTexto,
    "--color-selected": p.selecionado,
    "--color-selected-border": p.destaque,
    "--color-focus": p.destaqueTexto,
  } as CSSProperties;
}
