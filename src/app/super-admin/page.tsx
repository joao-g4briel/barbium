import { prisma } from "@/lib/prisma";

export default async function DashboardSuperAdmin() {
  const [total, ativas, porPlano] = await Promise.all([
    prisma.barbearia.count(),
    prisma.barbearia.count({ where: { ativo: true } }),
    prisma.barbearia.groupBy({
      by: ["plano"],
      _count: { _all: true },
      where: { ativo: true },
    }),
  ]);

  const contagemPorPlano = Object.fromEntries(
    porPlano.map((linha) => [linha.plano, linha._count._all]),
  );

  const cartoes = [
    { titulo: "Barbearias cadastradas", valor: total },
    { titulo: "Barbearias ativas", valor: ativas },
    { titulo: "Plano Solo", valor: contagemPorPlano.SOLO ?? 0 },
    { titulo: "Plano Barbearia", valor: contagemPorPlano.BARBEARIA ?? 0 },
    { titulo: "Plano Rede", valor: contagemPorPlano.REDE ?? 0 },
  ];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Visão geral</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {cartoes.map((cartao) => (
          <div key={cartao.titulo} className="card">
            <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>
              {cartao.titulo}
            </p>
            <p style={{ fontSize: "2rem", fontWeight: 900, margin: "8px 0 0" }}>
              {cartao.valor}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
