"use client";

import Link from "next/link";
import { Marca } from "@/components/ui/marca";

export default function ErroRaiz({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="pagina-central">
      <div className="pagina-central-conteudo">
        <Marca variante="erro" />
        <div style={{ display: "grid", gap: 8 }}>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800 }}>Algo deu errado</h1>
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
