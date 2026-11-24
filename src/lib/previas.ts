import manifesto from "../../docs/images/carrossel.json";

// Prévias ilustrativas do carrossel da landing. A origem é docs/images
// (manifesto carrossel.json + WebP); o site serve as cópias publicadas em
// public/images/barbium pelo scripts/publicar-imagens.mjs. As artes não são
// capturas do sistema: a indicação "Prévia ilustrativa" vem nelas e na legenda.

export interface Previa {
  ordem: number;
  titulo: string;
  descricao: string;
  alt: string;
  src: string;
  largura: number;
  altura: number;
}

export const PASTA_PREVIAS = "/images/barbium";

export const PREVIAS: Previa[] = [...manifesto.slides]
  .sort((a, b) => a.order - b.order)
  .map((s) => ({
    ordem: s.order,
    titulo: s.title,
    descricao: s.description,
    alt: s.alt,
    src: `${PASTA_PREVIAS}/${s.webp}`,
    largura: s.width,
    altura: s.height,
  }));
