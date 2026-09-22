import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { FormularioEditarServico } from "./formulario-editar-servico";

export default async function EditarServico({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const servico = await prisma.servico.findUnique({ where: { id } });

  // Confere que o serviço é mesmo dessa barbearia antes de mostrar —
  // mesma regra de isolamento aplicada na rota de API.
  if (!servico || servico.barbeariaId !== sessao.barbeariaId) notFound();

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{servico.nome}</h1>
      <FormularioEditarServico
        servicoId={servico.id}
        nomeInicial={servico.nome}
        duracaoInicial={servico.duracaoMinutos}
        precoInicial={Number(servico.preco)}
        comissaoInicial={
          servico.comissaoPercentual != null ? Number(servico.comissaoPercentual) : null
        }
        ativoInicial={servico.ativo}
      />
    </div>
  );
}
