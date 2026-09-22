import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { BotaoSair } from "@/components/botao-sair";

export default async function LayoutPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessao();
  if (!sessao || (sessao.role !== "DONO" && sessao.role !== "BARBEIRO")) {
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
          <Link href="/painel" style={{ fontWeight: 900, letterSpacing: "0.03em" }}>
            BARB<span style={{ color: "var(--neon)" }}>IUM</span>
          </Link>
          <nav style={{ display: "flex", gap: 20, fontSize: "0.9375rem" }}>
            <Link href="/painel">Agenda</Link>
            <Link href="/painel/clientes">Clientes</Link>
            <Link href="/painel/servicos">Serviços</Link>
            {sessao.role === "DONO" && <Link href="/painel/equipe">Equipe</Link>}
            {sessao.role === "DONO" && <Link href="/painel/caixa">Caixa</Link>}
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
