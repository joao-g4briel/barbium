import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AssistenteAgendamento } from "./assistente-agendamento";

export default async function AgendamentoPublico({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const barbearia = await prisma.barbearia.findUnique({
    where: { slug },
    include: {
      servicos: { where: { ativo: true }, orderBy: { nome: "asc" } },
      usuarios: {
        where: { ativo: true, role: { in: ["DONO", "BARBEIRO"] } },
        orderBy: { nome: "asc" },
      },
    },
  });

  if (!barbearia || !barbearia.ativo) notFound();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{barbearia.nome}</h1>

      {barbearia.servicos.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Essa barbearia ainda não cadastrou os serviços.
          </p>
        </div>
      ) : barbearia.usuarios.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Essa barbearia ainda não tem profissionais disponíveis.
          </p>
        </div>
      ) : (
        <AssistenteAgendamento
          slug={slug}
          servicos={barbearia.servicos.map((s) => ({
            id: s.id,
            nome: s.nome,
            duracaoMinutos: s.duracaoMinutos,
            preco: Number(s.preco),
          }))}
          profissionais={barbearia.usuarios.map((u) => ({ id: u.id, nome: u.nome }))}
        />
      )}
    </main>
  );
}
