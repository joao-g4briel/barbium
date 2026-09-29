import type { CSSProperties } from "react";
import { iniciais } from "@/lib/formatar";

export function Avatar({ nome, tamanho = 40 }: { nome: string; tamanho?: number }) {
  return (
    <span className="avatar" style={{ "--avatar-tamanho": `${tamanho}px` } as CSSProperties} aria-hidden="true">
      {iniciais(nome)}
    </span>
  );
}
