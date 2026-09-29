import type { ReactNode } from "react";

export function Indicador({
  rotulo,
  valor,
  detalhe,
  icone,
  tomIcone,
  tomValor,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  icone?: ReactNode;
  tomIcone?: "primario" | "perigo";
  tomValor?: "positivo" | "negativo";
}) {
  return (
    <div className="indicador">
      {icone && (
        <span className="indicador-icone" data-tom={tomIcone} aria-hidden="true">
          {icone}
        </span>
      )}
      <div className="indicador-texto">
        <p className="indicador-rotulo">{rotulo}</p>
        <p className="indicador-valor" data-tom={tomValor}>
          {valor}
        </p>
        {detalhe && <p className="indicador-detalhe">{detalhe}</p>}
      </div>
    </div>
  );
}
