import { CAMINHO_FAIXAS, CAMINHO_NOME, CAMINHO_TAMPAS, LARGURA_LOGO, LARGURA_SIMBOLO } from "./marca-caminhos";

// Logo aprovada do Barbium (docs/images), vetorizada: poste com tampas
// arredondadas e três faixas diagonais, ao lado do nome. Tampas e nome usam a
// cor do texto (currentColor); as faixas, o verde de destaque (.marca-faixas).
// `tamanho` é a altura da arte em pixels.

export function SimboloBarbium({ tamanho = 24 }: { tamanho?: number }) {
  return (
    <svg
      className="marca-simbolo"
      width={+((tamanho * LARGURA_SIMBOLO) / 100).toFixed(2)}
      height={tamanho}
      viewBox={`0 0 ${LARGURA_SIMBOLO} 100`}
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={CAMINHO_TAMPAS} />
      <path className="marca-faixas" d={CAMINHO_FAIXAS} />
    </svg>
  );
}

export function Marca({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <span className="marca">
      <svg
        width={+((tamanho * LARGURA_LOGO) / 100).toFixed(2)}
        height={tamanho}
        viewBox={`0 0 ${LARGURA_LOGO} 100`}
        role="img"
        aria-label="Barbium"
      >
        <path fill="currentColor" fillRule="evenodd" d={CAMINHO_TAMPAS + CAMINHO_NOME} />
        <path className="marca-faixas" d={CAMINHO_FAIXAS} />
      </svg>
    </span>
  );
}
