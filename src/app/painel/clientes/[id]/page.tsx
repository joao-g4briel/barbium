import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { ROTULO_STATUS as ROTULO_STATUS_AGENDAMENTO, classeBadgeStatus } from "@/lib/status-agendamento";
import { FormularioEditarCliente } from "./formulario-editar-cliente";
import { SecaoAssinatura } from "./secao-assinatura";

export default async function DetalheCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente || cliente.barbeariaId !== sessao.barbeariaId) notFound();

  const agendamentos = await prisma.agendamento.findMany({
    where: { clienteId: cliente.id },
    orderBy: { inicio: "desc" },
    take: 10,
    include: { servico: true, barbeiro: true },
  });

  const souDono = sessao.role === "DONO";

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{cliente.nome}</h1>

      {souDono ? (
        <FormularioEditarCliente
          clienteId={cliente.id}
          nomeInicial={cliente.nome}
          telefoneInicial={cliente.telefone}
        />
      ) : (
        <div className="card">
          <p style={{ margin: 0 }}>{cliente.telefone}</p>
        </div>
      )}

      {souDono && (
        <SecaoAssinatura
          clienteId={cliente.id}
          tipoAtual={cliente.assinaturaTipo}
          valorAtual={cliente.assinaturaValor != null ? Number(cliente.assinaturaValor) : null}
          vencimentoAtual={cliente.assinaturaVencimento?.toISOString() ?? null}
        />
      )}

      <div>
        <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: 10 }}>
          Últimos agendamentos
        </h2>
        {agendamentos.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Nenhum agendamento ainda.</p>
        ) : (
          <div className="item-list">
            {agendamentos.map((agendamento) => (
              <div key={agendamento.id} className="card item-row">
                <div className="item-row-main">
                  <div className="item-row-title">
                    {agendamento.inicio.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}{" "}
                    às{" "}
                    {agendamento.inicio.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="item-row-sub">
                    {agendamento.servico.nome} · {agendamento.barbeiro.nome}
                  </div>
                </div>
                <span className={classeBadgeStatus(agendamento.status)}>
                  {ROTULO_STATUS_AGENDAMENTO[agendamento.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
