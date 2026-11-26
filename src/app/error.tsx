"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Marca } from "@/components/ui/marca";

export default function ErroRaiz({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Erro que quebrou a tela no navegador: o servidor não fica sabendo.
  useEffect(() => {
    // Importado só aqui, para não pesar em toda página.
    void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <main className="pagina-central">
      <div className="pagina-central-conteudo">
        <Marca tamanho={28} />
        <div style={{ display: "grid", gap: 8 }}>
          <h1 className="pagina-central-titulo">Algo deu errado</h1>
          <p className="texto-secundario">Não foi possível carregar esta página. Tente de novo em instantes.</p>
        </div>
        <div className="form-acoes" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Tentar de novo
          </button>
          <Link href="/" className="btn btn-secondary">
            Ir para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
