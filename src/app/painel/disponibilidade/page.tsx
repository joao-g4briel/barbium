import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { ORDEM_DIAS_SEMANA } from "@/lib/dias-semana";
import { FormularioExpediente } from "./formulario-expediente";
import { SecaoBloqueios } from "./secao-bloqueios";

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
    <div style={{ display: "grid", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 4 }}>Disponibilidade</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Define quando você atende e trava a agenda quando precisar.
        </p>
      </div>

      <SecaoBloqueios
        bloqueiosIniciais={bloqueios.map((b) => ({
          id: b.id,
          inicio: b.inicio.toISOString(),
          fim: b.fim?.toISOString() ?? null,
          motivo: b.motivo,
        }))}
      />

      <div>
        <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: 10 }}>
          Expediente semanal
        </h2>
        <FormularioExpediente diasIniciais={dias} />
      </div>
    </div>
  );
}
