import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { BotaoSair } from "@/components/botao-sair";
import { NavInferior, type ItemNavInferior } from "@/components/nav-inferior";

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

  const itensNav: ItemNavInferior[] = [
    { href: "/super-admin", rotulo: "Visão geral", icone: "layout-dashboard" },
    { href: "/super-admin/barbearias", rotulo: "Barbearias", icone: "store" },
  ];

  return (
    <div style={{ minHeight: "100dvh" }}>
      <header className="app-header">
        <div className="container-app app-header-inner">
          <Link href="/super-admin" className="brand">
            <span className="brand-mark" aria-hidden="true"></span>
            BARBIUM{" "}
            <span style={{ color: "var(--muted)", fontWeight: 500 }}>admin</span>
          </Link>

          <nav className="top-nav-links">
            {itensNav.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.rotulo}
              </Link>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="header-nome">{sessao.nome}</span>
            <BotaoSair />
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <NavInferior itens={itensNav} />
    </div>
  );
}
