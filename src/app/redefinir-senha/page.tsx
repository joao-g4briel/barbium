import type { Metadata } from "next";
import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { Marca } from "@/components/ui/marca";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { buscarTokenValido } from "@/lib/recuperacao-senha";
import { SENHA_MINIMO } from "@/lib/senha";
import { FormularioRedefinirSenha } from "./formulario-redefinir-senha";

// O token vai na URL: nada de indexar a página nem vazar o endereço como
// "referer" pra outro site.
export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PaginaRedefinirSenha({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const registro = token ? await buscarTokenValido(token) : null;

  return (
    <main className="auth">
      <div className="auth-caixa">
        <div className="auth-cabecalho">
          <Marca variante="login" tamanho={28} />
          <div>
            <h1 className="auth-titulo">Nova senha</h1>
            {registro && (
              <p className="auth-subtitulo">Escolha a nova senha de acesso de {registro.usuario.email}.</p>
            )}
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          {registro && token ? (
            <FormularioRedefinirSenha token={token} minimo={SENHA_MINIMO} />
          ) : (
            <EstadoVazio
              icone={<LinkIcon size={22} />}
              titulo="Link inválido ou expirado"
              descricao="Os links de redefinição valem por pouco tempo e só podem ser usados uma vez. Peça um novo."
              acao={
                <Link href="/recuperar-senha" className="btn btn-primary">
                  Pedir novo link
                </Link>
              }
            />
          )}
        </div>
      </div>
    </main>
  );
}
