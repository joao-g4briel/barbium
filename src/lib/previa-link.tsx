import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CAMINHO_BARRAS, CAMINHO_FAIXAS, CAMINHO_NOME, LARGURA_LOGO, LARGURA_SIMBOLO } from "@/components/ui/marca-caminhos";

// Peças das imagens de prévia (o cartão que aparece quando um link é colado
// no WhatsApp, Instagram etc.), geradas com next/og. As fontes ficam em
// assets/fontes (Archivo condensada da landing e Manrope do corpo, OFL) e
// entram no deploy pelo outputFileTracingIncludes do next.config.ts.

export const TAMANHO_PREVIA = { width: 1200, height: 630 };

export async function fontesDaPrevia() {
  const pasta = join(process.cwd(), "assets", "fontes");
  const [archivo, manrope500, manrope700] = await Promise.all([
    readFile(join(pasta, "archivo-condensada-800.woff")),
    readFile(join(pasta, "manrope-500.woff")),
    readFile(join(pasta, "manrope-700.woff")),
  ]);
  return [
    { name: "Archivo", data: archivo, weight: 800 as const, style: "normal" as const },
    { name: "Manrope", data: manrope500, weight: 500 as const, style: "normal" as const },
    { name: "Manrope", data: manrope700, weight: 700 as const, style: "normal" as const },
  ];
}

// Logo do Barbium (faixas + nome) ou só o símbolo, nas cores pedidas.
export function LogoBarbium({ altura, texto, destaque, soSimbolo = false }: { altura: number; texto: string; destaque: string; soSimbolo?: boolean }) {
  const largura = soSimbolo ? LARGURA_SIMBOLO : LARGURA_LOGO;
  return (
    <svg width={(altura * largura) / 100} height={altura} viewBox={`0 0 ${largura} 100`}>
      <path fill={texto} fillRule="evenodd" d={soSimbolo ? CAMINHO_BARRAS : CAMINHO_BARRAS + CAMINHO_NOME} />
      <path fill={destaque} d={CAMINHO_FAIXAS} />
    </svg>
  );
}
