import type { ReactNode } from "react";

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
  compacto,
}: {
  icone: ReactNode;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  compacto?: boolean;
}) {
  return (
    <div className={`estado-vazio${compacto ? " estado-vazio-compacto" : ""}`}>
      <span className="estado-vazio-icone" aria-hidden="true">
        {icone}
      </span>
      <p className="estado-vazio-titulo">{titulo}</p>
      {descricao && <p className="estado-vazio-descricao">{descricao}</p>}
      {acao && <div className="estado-vazio-acao">{acao}</div>}
    </div>
  );
}
