import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Plano } from "@prisma/client";
import { Marca } from "@/components/ui/marca";
import { obterSessao } from "@/lib/sessao";
import { DIAS_TESTE } from "@/lib/precos";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = {
  title: "Criar conta",
  description: `Cadastre sua barbearia no Barbium e use tudo por ${DIAS_TESTE} dias grátis, sem cartão.`,
};

// O plano não é escolhido no cadastro: vem do botão da tabela de preços ou,
// sem ele, fica o Barbearia, que no teste deixa cadastrar até 5 profissionais.
// A escolha de verdade é feita ao assinar.
function planoValido(valor: string | undefined): Plano {
  return valor === "SOLO" || valor === "REDE" ? valor : "BARBEARIA";
}

export default async function PaginaCadastro({ searchParams }: { searchParams: Promise<{ plano?: string }> }) {
  const sessao = await obterSessao();
  if (sessao) redirect(sessao.role === "SUPER_ADMIN" ? "/super-admin" : "/painel");

  const { plano } = await searchParams;

  return (
    <main className="auth">
      <div className="auth-caixa auth-caixa-larga">
        <div className="auth-cabecalho">
          <Link href="/" aria-label="Barbium — início">
            <Marca tamanho={34} />
          </Link>
          <div>
            <h1 className="auth-titulo">Crie a conta da sua barbearia</h1>
            <p className="auth-subtitulo">
              {DIAS_TESTE} dias grátis com tudo liberado. Sem cartão; você só paga se continuar.
            </p>
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <FormularioCadastro plano={planoValido(plano)} />
        </div>
        <p className="auth-rodape">
          Já tem conta?{" "}
          <Link href="/login" className="link">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
