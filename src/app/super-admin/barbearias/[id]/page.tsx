import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormularioEditarBarbearia } from "./formulario-editar-barbearia";

export default async function DetalheBarbearia({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const barbearia = await prisma.barbearia.findUnique({
    where: { id },
    include: {
      usuarios: { orderBy: { criadoEm: "asc" } },
      _count: { select: { clientes: true, agendamentos: true } },
    },
  });

  if (!barbearia) notFound();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>{barbearia.nome}</h1>
        <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>/{barbearia.slug}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        <FormularioEditarBarbearia
          barbeariaId={barbearia.id}
          planoAtual={barbearia.plano}
          ativoAtual={barbearia.ativo}
        />

        <div className="card">
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, marginTop: 0 }}>Equipe</h2>
          {barbearia.usuarios.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Nenhum usuário cadastrado.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {barbearia.usuarios.map((usuario) => (
                <li key={usuario.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                  <div style={{ fontWeight: 700 }}>{usuario.nome}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                    {usuario.email} · {usuario.role === "DONO" ? "Dono" : "Barbeiro"}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem" }}>
            {barbearia._count.clientes} clientes cadastrados · {barbearia._count.agendamentos}{" "}
            agendamentos no total
          </p>
        </div>
      </div>
    </div>
  );
}
