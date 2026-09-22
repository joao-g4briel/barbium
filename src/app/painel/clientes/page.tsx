import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { statusAssinatura, ROTULO_STATUS_ASSINATURA } from "@/lib/assinatura";

function classeBadgeAssinatura(status: ReturnType<typeof statusAssinatura>): string {
  if (status === "ATIVA") return "badge badge-ativo";
  if (status === "VENCIDA") return "badge badge-inativo";
  return "badge";
}

export default async function PaginaClientes() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const clientes = await prisma.cliente.findMany({
    where: { barbeariaId: sessao.barbeariaId },
    orderBy: { nome: "asc" },
  });

  const souDono = sessao.role === "DONO";

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
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Clientes</h1>
        {souDono && (
          <Link href="/painel/clientes/novo" className="btn btn-primary">
            Novo cliente
          </Link>
        )}
      </div>

      {clientes.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Nenhum cliente ainda. Eles aparecem aqui sozinhos assim que alguém agendar pelo link
            público, ou você pode cadastrar um na mão.
          </p>
        </div>
      ) : (
        <div className="item-list">
          {clientes.map((cliente) => {
            const status = statusAssinatura(cliente.assinaturaVencimento);
            return (
              <Link
                key={cliente.id}
                href={`/painel/clientes/${cliente.id}`}
                className="card item-row"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="item-row-main">
                  <div className="item-row-title">{cliente.nome}</div>
                  <div className="item-row-sub">{cliente.telefone}</div>
                </div>
                {status !== "SEM_ASSINATURA" && (
                  <span className={classeBadgeAssinatura(status)}>
                    {ROTULO_STATUS_ASSINATURA[status]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
