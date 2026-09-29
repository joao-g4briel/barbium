// Símbolo do Barbium: o poste de barbeiro, redesenhado no verde da marca.
// `variante` só existe pra dar um id único ao clipPath quando a marca
// aparece mais de uma vez na mesma página (menu lateral e barra do topo).
export function SimboloBarbium({ variante, tamanho = 24 }: { variante: string; tamanho?: number }) {
  const clipId = `barbium-poste-${variante}`;
  return (
    <svg
      width={(tamanho * 2) / 3}
      height={tamanho}
      viewBox="0 0 16 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="2.5" y="2.5" width="11" height="19" rx="5.5" />
        </clipPath>
      </defs>
      <rect x="1.25" y="1.25" width="13.5" height="21.5" rx="6.75" stroke="currentColor" strokeWidth="2.5" />
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M-4 9 18 -2M-4 16 18 5M-4 23 18 12M-4 30 18 19"
          stroke="currentColor"
          strokeWidth="3.2"
        />
      </g>
    </svg>
  );
}

export function Marca({ variante, tamanho = 24 }: { variante: string; tamanho?: number }) {
  return (
    <span className="marca">
      <SimboloBarbium variante={variante} tamanho={tamanho} />
      barbium
    </span>
  );
}
