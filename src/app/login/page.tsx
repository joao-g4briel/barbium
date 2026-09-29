import type { Metadata } from "next";
import { Marca } from "@/components/ui/marca";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = { title: "Entrar" };

// Só aceita redirecionar pra dentro do próprio app depois do login.
function rotaSegura(valor: string | undefined): string | null {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) return null;
  return valor;
}

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="auth">
      <div className="auth-caixa">
        <div className="auth-cabecalho">
          <Marca variante="login" tamanho={28} />
          <div>
            <h1 className="auth-titulo">Entrar no painel</h1>
            <p className="auth-subtitulo">Agenda, clientes e caixa da sua barbearia.</p>
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <FormularioLogin proximaRota={rotaSegura(next)} />
        </div>
      </div>
    </main>
  );
}
