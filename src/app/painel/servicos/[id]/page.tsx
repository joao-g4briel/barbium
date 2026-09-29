import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { FormularioServico } from "../formulario-servico";

export const metadata: Metadata = { title: "Editar serviço" };

export default async function EditarServico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const servico = await prisma.servico.findUnique({ where: { id } });

  // Confere que o serviço é mesmo dessa barbearia antes de mostrar —
  // mesma regra de isolamento aplicada na rota de API.
  if (!servico || servico.barbeariaId !== sessao.barbeariaId) notFound();

  return (
    <>
      <CabecalhoPagina titulo={servico.nome} voltar={{ href: "/painel/servicos", rotulo: "Serviços" }} />
      {sessao.role === "DONO" ? (
        <FormularioServico
          servicoId={servico.id}
          valoresIniciais={{
            nome: servico.nome,
            duracaoMinutos: String(servico.duracaoMinutos),
            preco: String(Number(servico.preco)).replace(".", ","),
            comissaoPercentual:
              servico.comissaoPercentual != null ? String(Number(servico.comissaoPercentual)).replace(".", ",") : "",
            ativo: servico.ativo,
          }}
        />
      ) : (
        <AcessoRestrito descricao="Só o dono da barbearia edita serviços, preços e comissões." />
      )}
    </>
  );
}
