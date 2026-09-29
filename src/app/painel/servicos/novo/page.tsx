import type { Metadata } from "next";
import { obterSessao } from "@/lib/sessao";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { FormularioServico } from "../formulario-servico";

export const metadata: Metadata = { title: "Novo serviço" };

export default async function NovoServico() {
  const sessao = await obterSessao();

  return (
    <>
      <CabecalhoPagina titulo="Novo serviço" voltar={{ href: "/painel/servicos", rotulo: "Serviços" }} />
      {sessao?.role === "DONO" ? (
        <FormularioServico />
      ) : (
        <AcessoRestrito descricao="Só o dono da barbearia cadastra serviços, preços e comissões." />
      )}
    </>
  );
}
