import type { ReactNode } from "react";

export function Indicador({
  rotulo,
  valor,
  detalhe,
  icone,
  tomIcone,
  tomValor,
  destaque = false,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  icone?: ReactNode;
  tomIcone?: "primario" | "perigo";
  tomValor?: "positivo" | "negativo";
  // O indicador principal da página: mais largo e com o valor maior.
  destaque?: boolean;
}) {
  return (
    <div className="indicador" data-destaque={destaque || undefined}>
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
