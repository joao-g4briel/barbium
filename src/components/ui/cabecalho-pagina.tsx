import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  voltar,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  voltar?: { href: string; rotulo: string };
}) {
  return (
    <header className="page-header">
      <div className="page-header-texto">
        {voltar && (
          <Link href={voltar.href} className="voltar">
            <ChevronLeft size={16} aria-hidden="true" />
            {voltar.rotulo}
          </Link>
        )}
        <h1>{titulo}</h1>
        {descricao && <p className="page-header-descricao">{descricao}</p>}
      </div>
      {acoes && <div className="page-header-acoes">{acoes}</div>}
    </header>
  );
}
