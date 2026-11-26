import { CAMINHO_BARRAS, CAMINHO_FAIXAS, CAMINHO_NOME, LARGURA_LOGO, LARGURA_SIMBOLO } from "./marca-caminhos";

// Logo do Barbium (docs/logo): três faixas inclinadas, a do meio verde e mais
// longa, como o horário marcado na régua do dia, ao lado do nome em grotesca
// condensada. Faixas claras e nome usam a cor do texto (currentColor); a faixa
// do meio, o verde de destaque (.marca-faixas). `tamanho` é a altura da arte
// em pixels.

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
      <path fill="currentColor" d={CAMINHO_BARRAS} />
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
        <path fill="currentColor" fillRule="evenodd" d={CAMINHO_BARRAS + CAMINHO_NOME} />
        <path className="marca-faixas" d={CAMINHO_FAIXAS} />
      </svg>
    </span>
  );
}
