import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { FormularioPlano } from "../formulario-plano";

export const metadata: Metadata = { title: "Novo plano" };

export default async function NovoPlano() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const servicos =
    sessao.role === "DONO"
      ? await prisma.servico.findMany({
          where: { barbeariaId: sessao.barbeariaId, ativo: true },
          orderBy: { nome: "asc" },
          select: { id: true, nome: true, preco: true, ativo: true },
        })
      : [];

  return (
    <>
      <CabecalhoPagina titulo="Novo plano" voltar={{ href: "/painel/planos", rotulo: "Planos de corte" }} />
      {sessao.role === "DONO" ? (
        <FormularioPlano servicos={servicos.map((s) => ({ ...s, preco: Number(s.preco) }))} />
      ) : (
        <AcessoRestrito descricao="Só o dono da barbearia cria planos de corte." />
      )}
    </>
  );
}
