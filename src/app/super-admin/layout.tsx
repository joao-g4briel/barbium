import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { BotaoSair } from "@/components/botao-sair";

// O middleware já bloqueia quem não é SUPER_ADMIN antes de chegar aqui.
// Essa checagem é uma segunda camada — nunca confie só no middleware.
export default async function LayoutSuperAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessao();
  if (!sessao || sessao.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100dvh" }}>
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link href="/super-admin" style={{ fontWeight: 900, letterSpacing: "0.03em" }}>
            BARB<span style={{ color: "var(--neon)" }}>IUM</span>{" "}
            <span style={{ color: "var(--muted)", fontWeight: 500 }}>super admin</span>
          </Link>
          <nav style={{ display: "flex", gap: 16, rowGap: 8, fontSize: "0.9375rem", flexWrap: "wrap" }}>
            <Link href="/super-admin">Visão geral</Link>
            <Link href="/super-admin/barbearias">Barbearias</Link>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>{sessao.nome}</span>
          <BotaoSair />
        </div>
      </header>
      <main style={{ padding: 24, maxWidth: 1120, margin: "0 auto" }}>{children}</main>
    </div>
  );
}
