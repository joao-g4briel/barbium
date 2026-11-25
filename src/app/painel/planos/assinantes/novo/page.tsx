import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Repeat } from "lucide-react";
import { FormularioAssinante } from "./formulario-assinante";

export const metadata: Metadata = { title: "Adicionar assinante" };

export default async function NovoAssinante({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;
  const { cliente: clienteId } = await searchParams;

  const voltar = { href: "/painel/planos", rotulo: "Planos de corte" };
  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo="Adicionar assinante" voltar={voltar} />
        <AcessoRestrito descricao="Só o dono da barbearia gerencia os assinantes." />
      </>
    );
  }

  const [planos, cliente] = await Promise.all([
    prisma.planoCorte.findMany({
      where: { barbeariaId: sessao.barbeariaId, ativo: true },
      orderBy: { valor: "asc" },
      select: { id: true, nome: true, valor: true, usosPorMes: true },
    }),
    clienteId
      ? prisma.cliente.findFirst({
          where: { id: clienteId, barbeariaId: sessao.barbeariaId, removidoEm: null },
          select: { id: true, nome: true },
        })
      : null,
  ]);

  const voltarPara = cliente ? `/painel/clientes/${cliente.id}` : "/painel/planos";

  return (
    <>
      <CabecalhoPagina
        titulo="Adicionar assinante"
        descricao="Para quem pagou o plano no balcão"
        voltar={cliente ? { href: voltarPara, rotulo: cliente.nome } : voltar}
      />
      {planos.length === 0 ? (
        <div className="card">
          <EstadoVazio
            icone={<Repeat size={22} />}
            titulo="Nenhum plano à venda"
            descricao="Crie um plano de corte antes de adicionar assinantes."
            acao={
              <Link href="/painel/planos/novo" className="btn btn-primary">
                Criar plano
              </Link>
            }
          />
        </div>
      ) : (
        <FormularioAssinante
          planos={planos.map((p) => ({ ...p, valor: Number(p.valor) }))}
          cliente={cliente}
          voltarPara={voltarPara}
        />
      )}
    </>
  );
}
