import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Sem login: o cliente final chega aqui pelo link que a barbearia divulga
// no Instagram/WhatsApp. Por enquanto lista os serviços — o formulário de
// escolher barbeiro, horário e confirmar entra na próxima etapa.
export default async function AgendamentoPublico({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const barbearia = await prisma.barbearia.findUnique({
    where: { slug },
    include: {
      servicos: { where: { ativo: true }, orderBy: { nome: "asc" } },
    },
  });

  if (!barbearia || !barbearia.ativo) notFound();

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{barbearia.nome}</h1>
      <p style={{ color: "var(--muted)" }}>Escolha um serviço pra continuar.</p>

      {barbearia.servicos.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Essa barbearia ainda não cadastrou os serviços.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {barbearia.servicos.map((servico) => (
            <div
              key={servico.id}
              className="card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <strong>{servico.nome}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>
                  {servico.duracaoMinutos} min
                </div>
              </div>
              <strong>
                {Number(servico.preco).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
