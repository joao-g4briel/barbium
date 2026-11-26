import type { ReactNode } from "react";
import Link from "next/link";
import { Marca } from "@/components/ui/marca";

// Molde das páginas legais (termos e privacidade): leitura confortável,
// sumário no topo e contato no fim. Cada página informa a data da própria
// última versão.
export function PaginaLegal({
  titulo,
  atualizadoEm,
  resumo,
  secoes,
}: {
  titulo: string;
  atualizadoEm: string;
  resumo: ReactNode;
  secoes: { id: string; titulo: string; conteudo: ReactNode }[];
}) {
  return (
    <div className="legal">
      <header className="legal-topo">
        <div className="legal-largura legal-topo-conteudo">
          <Link href="/" aria-label="Barbium — início" className="landing-marca">
            <Marca tamanho={28} />
          </Link>
          <Link href="/cadastro" className="btn btn-secondary btn-sm">
            Criar conta
          </Link>
        </div>
      </header>

      <main className="legal-largura legal-corpo">
        <h1 className="legal-titulo">{titulo}</h1>
        <p className="legal-data">Atualizado em {atualizadoEm}</p>
        <div className="legal-resumo">{resumo}</div>

        <nav className="legal-sumario" aria-label="Nesta página">
          <ol>
            {secoes.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.titulo}</a>
              </li>
            ))}
          </ol>
        </nav>

        {secoes.map((s) => (
          <section key={s.id} id={s.id} className="legal-secao" aria-labelledby={`${s.id}-titulo`}>
            <h2 id={`${s.id}-titulo`}>{s.titulo}</h2>
            {s.conteudo}
          </section>
        ))}
      </main>

      <footer className="landing-rodape">
        <div className="legal-largura landing-rodape-conteudo">
          <Marca tamanho={24} />
          <nav aria-label="Rodapé" className="landing-rodape-links">
            <Link href="/termos">Termos de uso</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/login">Entrar</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
