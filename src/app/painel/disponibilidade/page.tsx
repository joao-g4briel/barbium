import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { ORDEM_DIAS_SEMANA } from "@/lib/dias-semana";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { FormularioExpediente } from "./formulario-expediente";
import { SecaoBloqueios } from "./secao-bloqueios";

export const metadata: Metadata = { title: "Meus horários" };

export default async function PaginaDisponibilidade() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const [expediente, bloqueios] = await Promise.all([
    prisma.expedienteDia.findMany({ where: { usuarioId: sessao.sub } }),
    prisma.bloqueioAgenda.findMany({
      where: { usuarioId: sessao.sub },
      orderBy: { inicio: "desc" },
    }),
  ]);

  const porDia = new Map(expediente.map((e) => [e.diaSemana, e]));
  const dias = ORDEM_DIAS_SEMANA.map((diaSemana) => {
    const existente = porDia.get(diaSemana);
    return {
      diaSemana,
      atende: existente?.atende ?? false,
      horaInicio: existente?.horaInicio ?? "09:00",
      horaFim: existente?.horaFim ?? "19:00",
      almocoInicio: existente?.almocoInicio ?? null,
      almocoFim: existente?.almocoFim ?? null,
    };
  });

  return (
    <>
      <CabecalhoPagina titulo="Meus horários" descricao="Quando você atende e quando sua agenda fica fechada." />
      <div className="pilha">
        <SecaoBloqueios
          bloqueiosIniciais={bloqueios.map((b) => ({
            id: b.id,
            inicio: b.inicio.toISOString(),
            fim: b.fim?.toISOString() ?? null,
            motivo: b.motivo,
          }))}
        />
        <FormularioExpediente diasIniciais={dias} />
      </div>
    </>
  );
}
