import type { Metadata } from "next";
import { obterSessao } from "@/lib/sessao";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { FormularioNovoCliente } from "./formulario-novo-cliente";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NovoCliente() {
  const sessao = await obterSessao();

  return (
    <>
      <CabecalhoPagina titulo="Novo cliente" voltar={{ href: "/painel/clientes", rotulo: "Clientes" }} />
      {sessao?.role === "DONO" ? (
        <FormularioNovoCliente />
      ) : (
        <AcessoRestrito descricao="Só o dono da barbearia pode cadastrar clientes manualmente." />
      )}
    </>
  );
}
