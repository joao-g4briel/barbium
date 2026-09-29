import Link from "next/link";
import { Marca } from "@/components/ui/marca";

export default function NaoEncontrada() {
  return (
    <main className="pagina-central">
      <div className="pagina-central-conteudo">
        <Marca variante="nao-encontrada" />
        <div style={{ display: "grid", gap: 8 }}>
          <p className="texto-secundario num" style={{ fontWeight: 700 }}>
            Erro 404
          </p>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 800 }}>Página não encontrada</h1>
          <p className="texto-secundario">O endereço pode ter mudado ou o link está incompleto.</p>
        </div>
        <Link href="/" className="btn btn-primary">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
