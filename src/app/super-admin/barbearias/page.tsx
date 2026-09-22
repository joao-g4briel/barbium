import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ROTULO_PLANO } from "@/lib/planos";

export default async function ListaBarbearias() {
  const barbearias = await prisma.barbearia.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      usuarios: {
        where: { role: "DONO" },
        select: { nome: true, email: true },
        take: 1,
      },
    },
  });

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Barbearias</h1>
        <Link href="/super-admin/barbearias/novo" className="btn btn-primary">
          Nova barbearia
        </Link>
      </div>

      {barbearias.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>
          Nenhuma barbearia cadastrada ainda. Crie a primeira pra começar.
        </p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Barbearia", "Dono", "Plano", "Status", ""].map((cabecalho) => (
                  <th
                    key={cabecalho}
                    style={{
                      textAlign: "left",
                      padding: "12px 20px",
                      color: "var(--muted)",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                    }}
                  >
                    {cabecalho}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barbearias.map((barbearia) => {
                const dono = barbearia.usuarios[0];
                return (
                  <tr key={barbearia.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 700 }}>{barbearia.nome}</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                        /{barbearia.slug}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {dono ? (
                        <>
                          <div>{dono.nome}</div>
                          <div style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                            {dono.email}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>Sem dono cadastrado</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px" }}>{ROTULO_PLANO[barbearia.plano]}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span className={barbearia.ativo ? "badge badge-ativo" : "badge badge-inativo"}>
                        {barbearia.ativo ? "Ativa" : "Suspensa"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <Link href={`/super-admin/barbearias/${barbearia.id}`} className="btn btn-ghost btn-sm">
                        Gerenciar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
