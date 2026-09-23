import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { BotaoSair } from "@/components/botao-sair";
import { NavInferior, type ItemNavInferior } from "@/components/nav-inferior";

export default async function LayoutPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessao();
  if (!sessao || (sessao.role !== "DONO" && sessao.role !== "BARBEIRO")) {
    redirect("/login");
  }

  const itensNav: ItemNavInferior[] = [
    { href: "/painel", rotulo: "Agenda", icone: "calendar" },
    { href: "/painel/disponibilidade", rotulo: "Horários", icone: "clock" },
    { href: "/painel/clientes", rotulo: "Clientes", icone: "users" },
    { href: "/painel/servicos", rotulo: "Serviços", icone: "scissors" },
    ...(sessao.role === "DONO"
      ? [{ href: "/painel/equipe", rotulo: "Equipe", icone: "user-plus" as const }]
      : []),
    ...(sessao.role === "DONO"
      ? [{ href: "/painel/caixa", rotulo: "Caixa", icone: "wallet" as const }]
      : []),
  ];

  return (
    <div style={{ minHeight: "100dvh" }}>
      <header className="app-header">
        <div className="container-app app-header-inner">
          <Link href="/painel" className="brand">
            <span className="brand-mark" aria-hidden="true"></span>
            BARBIUM
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
