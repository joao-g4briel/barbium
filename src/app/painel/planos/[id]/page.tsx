import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { FormularioPlano } from "../formulario-plano";

export const metadata: Metadata = { title: "Editar plano" };

function comVirgula(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

export default async function EditarPlano({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const plano = await prisma.planoCorte.findUnique({ where: { id }, include: { servicos: true } });
  if (!plano || plano.barbeariaId !== sessao.barbeariaId) notFound();

  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo={plano.nome} voltar={{ href: "/painel/planos", rotulo: "Planos de corte" }} />
        <AcessoRestrito descricao="Só o dono da barbearia edita planos de corte." />
      </>
    );
  }

  const servicos = await prisma.servico.findMany({
    where: { barbeariaId: sessao.barbeariaId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, preco: true, ativo: true },
  });
  const comissao = Number(plano.comissaoValor);

  return (
    <>
      <CabecalhoPagina titulo={plano.nome} voltar={{ href: "/painel/planos", rotulo: "Planos de corte" }} />
      <FormularioPlano
        planoId={plano.id}
        servicos={servicos.map((s) => ({ ...s, preco: Number(s.preco) }))}
        valoresIniciais={{
          nome: plano.nome,
          valor: comVirgula(Number(plano.valor)),
          ilimitado: plano.usosPorMes === null,
          usosPorMes: String(plano.usosPorMes ?? 4),
          comissaoValor: comissao > 0 ? comVirgula(comissao) : "",
          servicoIds: plano.servicos.map((s) => s.servicoId),
          ativo: plano.ativo,
        }}
      />
    </>
  );
}
