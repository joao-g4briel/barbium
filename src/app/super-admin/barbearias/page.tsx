import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ROTULO_PLANO } from "@/lib/planos";

export default async function ListaBarbearias() {
  const barbearias = await prisma.barbearia.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      usuarios: {
        where: { role: "DONO" },
        select: { nome: true },
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
        <div className="item-list">
          {barbearias.map((barbearia) => {
            const dono = barbearia.usuarios[0];
            return (
              <div key={barbearia.id} className="card item-row">
                <div className="item-row-main">
                  <div className="item-row-title">{barbearia.nome}</div>
                  <div className="item-row-sub">
                    /agendar/{barbearia.slug} · {ROTULO_PLANO[barbearia.plano]}
                    {dono ? ` · ${dono.nome}` : " · sem dono"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={barbearia.ativo ? "badge badge-ativo" : "badge badge-inativo"}>
                    {barbearia.ativo ? "Ativa" : "Suspensa"}
                  </span>
                  <Link href={`/super-admin/barbearias/${barbearia.id}`} className="btn btn-ghost btn-sm">
                    Gerenciar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
