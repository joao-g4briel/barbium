import type { CSSProperties } from "react";

export function Skeleton({ largura = "100%", altura = 16, raio }: { largura?: string | number; altura?: number; raio?: number }) {
  const estilo: CSSProperties = { width: largura, height: altura, borderRadius: raio };
  return <span className="skeleton" style={{ display: "block", ...estilo }} aria-hidden="true" />;
}

export function SkeletonPagina() {
  return (
    <div role="status" aria-live="polite" className="pilha">
      <span className="sr-only">Carregando…</span>
      <div style={{ display: "grid", gap: 10 }}>
        <Skeleton largura={220} altura={34} />
        <Skeleton largura={280} altura={18} />
      </div>
      <div className="indicadores">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="indicador" style={{ display: "grid", gap: 10 }}>
            <Skeleton largura="60%" altura={14} />
            <Skeleton largura="40%" altura={26} />
          </div>
        ))}
      </div>
      <div className="card" style={{ display: "grid", gap: 14 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skeleton largura={40} altura={40} raio={20} />
            <div style={{ flex: 1, display: "grid", gap: 8 }}>
              <Skeleton largura="45%" altura={14} />
              <Skeleton largura="30%" altura={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
