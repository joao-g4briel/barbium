import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface CampoProps {
  id: string;
  rotulo: string;
  opcional?: boolean;
  dica?: ReactNode;
  erro?: string | null;
  children: ReactNode;
}

// Rótulo sempre visível, dica e erro ligados ao campo por aria-describedby
// (use `ariaCampo` no input com o mesmo id).
export function Campo({ id, rotulo, opcional, dica, erro, children }: CampoProps) {
  return (
    <div className="campo">
      <label htmlFor={id} className="campo-rotulo">
        {rotulo}
        {opcional && <span className="campo-opcional"> (opcional)</span>}
      </label>
      {children}
      {dica && !erro && (
        <p id={`${id}-dica`} className="campo-dica">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="campo-erro">
          <AlertCircle size={14} aria-hidden="true" />
          {erro}
        </p>
      )}
    </div>
  );
}

export function ariaCampo(id: string, { dica, erro }: { dica?: boolean; erro?: string | null }) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return {
    id,
    "aria-describedby": descricao,
    "aria-invalid": erro ? (true as const) : undefined,
  };
}
