import { obterSessao } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { inicioDoDiaBrasil, fimDoDiaBrasil, FUSO_BRASIL } from "@/lib/fuso-brasil";
import { ROTULO_STATUS, classeBadgeStatus } from "@/lib/status-agendamento";
import { AcoesAgendamento } from "@/components/acoes-agendamento";

export default async function AgendaDoDia() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const agora = new Date();
  const inicioDoDia = inicioDoDiaBrasil(agora);
  const fimDoDia = fimDoDiaBrasil(agora);

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
        <div className="item-list">
          {agendamentosHoje.map((agendamento) => (
            <div key={agendamento.id} className="card item-row">
              <div className="item-row-main">
                <div className="item-row-title">
                  {agendamento.inicio.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: FUSO_BRASIL,
                  })}{" "}
                  — {agendamento.cliente.nome}
                </div>
                <div className="item-row-sub">
                  {agendamento.servico.nome}
                  {sessao.role === "DONO" && ` · ${agendamento.barbeiro.nome}`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className={classeBadgeStatus(agendamento.status)}>
                  {ROTULO_STATUS[agendamento.status]}
                </span>
                <AcoesAgendamento id={agendamento.id} status={agendamento.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
