import { obterSessao } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";

export default async function AgendaDoDia() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);
  const fimDoDia = new Date();
  fimDoDia.setHours(23, 59, 59, 999);

  const agendamentosHoje = await prisma.agendamento.findMany({
    where: {
      barbeariaId: sessao.barbeariaId,
      inicio: { gte: inicioDoDia, lte: fimDoDia },
      // Barbeiro vê só a própria agenda; dono vê a de todo mundo.
      ...(sessao.role === "BARBEIRO" ? { barbeiroId: sessao.sub } : {}),
    },
    orderBy: { inicio: "asc" },
    include: { cliente: true, servico: true, barbeiro: true },
  });

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Agenda de hoje</h1>

      {agendamentosHoje.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Nenhum agendamento pra hoje ainda. Divulgue o link de agendamento da sua barbearia
            pros clientes marcarem sozinhos.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {agendamentosHoje.map((agendamento) => (
            <div
              key={agendamento.id}
              className="card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
              }}
            >
              <div>
                <strong>
                  {agendamento.inicio.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>{" "}
                — {agendamento.cliente.nome}
                <div style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                  {agendamento.servico.nome}
                  {sessao.role === "DONO" && ` · ${agendamento.barbeiro.nome}`}
                </div>
              </div>
              <span className="badge badge-ativo">{agendamento.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
