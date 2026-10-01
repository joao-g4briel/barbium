import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { ROTULO_PAPEL } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { FormularioEditarProfissional } from "./formulario-editar-profissional";

export const metadata: Metadata = { title: "Profissional" };

export default async function EditarProfissional({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo="Profissional" voltar={{ href: "/painel", rotulo: "Visão geral" }} />
        <AcessoRestrito descricao="Só o dono da barbearia pode editar a equipe." />
      </>
    );
  }

  const profissional = await prisma.usuario.findUnique({ where: { id } });
  if (!profissional || profissional.barbeariaId !== sessao.barbeariaId) notFound();

  const agendamentosFuturos = await prisma.agendamento.count({
    where: {
      barbeiroId: profissional.id,
      status: { in: ["CONFIRMADO", "AGUARDANDO_PAGAMENTO"] },
      inicio: { gt: new Date() },
    },
  });

  return (
    <>
      <CabecalhoPagina
        titulo={profissional.nome}
        descricao={ROTULO_PAPEL[profissional.role]}
        voltar={{ href: "/painel/equipe", rotulo: "Equipe" }}
      />
      <FormularioEditarProfissional
        id={profissional.id}
        valoresIniciais={{
          nome: profissional.nome,
          email: profissional.email,
          comissao:
            profissional.comissaoPercentual != null
              ? Number(profissional.comissaoPercentual).toLocaleString("pt-BR")
              : "",
        }}
        ativoInicial={profissional.ativo}
        ehDono={profissional.role === "DONO"}
        agendamentosFuturos={agendamentosFuturos}
      />
    </>
  );
}
