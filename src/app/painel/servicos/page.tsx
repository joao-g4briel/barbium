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
        <div className="card" style={{ padding: 0, overflowX: "auto", overflowY: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Serviço", "Duração", "Preço", "Comissão", "Status", ""].map((cabecalho) => (
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
              {servicos.map((servico) => (
                <tr key={servico.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "14px 20px", fontWeight: 700 }}>{servico.nome}</td>
                  <td style={{ padding: "14px 20px" }}>{servico.duracaoMinutos} min</td>
                  <td style={{ padding: "14px 20px" }}>{formatarPreco(servico.preco)}</td>
                  <td style={{ padding: "14px 20px" }}>
                    {servico.comissaoPercentual != null
                      ? `${Number(servico.comissaoPercentual)}%`
                      : <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className={servico.ativo ? "badge badge-ativo" : "badge badge-inativo"}>
                      {servico.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    {souDono && (
                      <Link href={`/painel/servicos/${servico.id}`} className="btn btn-ghost btn-sm">
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
