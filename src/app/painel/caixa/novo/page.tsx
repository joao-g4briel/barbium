import type { Metadata } from "next";
import { obterSessao } from "@/lib/sessao";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { FormularioNovoLancamento } from "./formulario-novo-lancamento";

export const metadata: Metadata = { title: "Novo lançamento" };

export default async function NovoLancamento() {
  const sessao = await obterSessao();

  return (
    <>
      <CabecalhoPagina titulo="Novo lançamento" voltar={{ href: "/painel/caixa", rotulo: "Financeiro" }} />
      {sessao?.role === "DONO" ? (
        <FormularioNovoLancamento />
      ) : (
        <AcessoRestrito descricao="Só o dono da barbearia pode lançar no caixa." />
      )}
    </>
  );
}
