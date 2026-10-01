import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, MailX } from "lucide-react";
import { Marca } from "@/components/ui/marca";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { emailConfigurado } from "@/lib/email";
import { VALIDADE_LINK_MINUTOS } from "@/lib/recuperacao-senha";
import { FormularioRecuperarSenha } from "./formulario-recuperar-senha";

export const metadata: Metadata = { title: "Recuperar senha" };

// Lê a configuração de e-mail a cada acesso, não só no build.
export const dynamic = "force-dynamic";

export default function PaginaRecuperarSenha() {
  return (
    <main className="auth">
      <div className="auth-caixa">
        <div className="auth-cabecalho">
          <Marca variante="login" tamanho={28} />
          <div>
            <h1 className="auth-titulo">Recuperar senha</h1>
            <p className="auth-subtitulo">Enviamos um link para você escolher uma senha nova.</p>
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          {emailConfigurado() ? (
            <FormularioRecuperarSenha validadeMinutos={VALIDADE_LINK_MINUTOS} />
          ) : (
            <EstadoVazio
              icone={<MailX size={22} />}
              titulo="Recuperação por e-mail indisponível"
              descricao="Se você é da equipe de uma barbearia, peça ao dono uma senha temporária nova. Se você é o dono, fale com o suporte do Barbium."
            />
          )}
        </div>
        <Link href="/login" className="auth-link">
          <ChevronLeft size={16} aria-hidden="true" />
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
