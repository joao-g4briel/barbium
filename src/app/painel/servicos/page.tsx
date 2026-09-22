import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";

function formatarPreco(valor: unknown): string {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PaginaServicos() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const servicos = await prisma.servico.findMany({
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
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Serviços</h1>
        {souDono && (
          <Link href="/painel/servicos/novo" className="btn btn-primary">
            Novo serviço
          </Link>
        )}
      </div>

      {servicos.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            {souDono
              ? "Nenhum serviço cadastrado ainda. Cadastre pelo menos um pra ele aparecer na página pública de agendamento."
              : "Nenhum serviço cadastrado ainda."}
          </p>
        </div>
      ) : (
        <div className="item-list">
          {servicos.map((servico) => (
            <div key={servico.id} className="card item-row">
              <div className="item-row-main">
                <div className="item-row-title">{servico.nome}</div>
                <div className="item-row-sub">
                  {servico.duracaoMinutos} min · {formatarPreco(servico.preco)}
                  {servico.comissaoPercentual != null &&
                    ` · comissão ${Number(servico.comissaoPercentual)}%`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={servico.ativo ? "badge badge-ativo" : "badge badge-inativo"}>
                  {servico.ativo ? "Ativo" : "Inativo"}
                </span>
                {souDono && (
                  <Link href={`/painel/servicos/${servico.id}`} className="btn btn-ghost btn-sm">
                    Editar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
