import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { ROTULO_PAPEL } from "@/lib/formatar";
import { Shell } from "@/components/app/shell";
import type { ItemNav } from "@/components/app/navegacao";

// O middleware já bloqueia quem não é SUPER_ADMIN antes de chegar aqui.
// Essa checagem é uma segunda camada — nunca confie só no middleware.
export default async function LayoutSuperAdmin({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();
  if (!sessao || sessao.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const visaoGeral: ItemNav = { href: "/super-admin", rotulo: "Visão geral", icone: "painel" };
  const barbearias: ItemNav = { href: "/super-admin/barbearias", rotulo: "Barbearias", icone: "barbearias" };

  return (
    <Shell
      variante="plataforma"
      contexto={{ nome: "Admin da plataforma", detalhe: "Gestão das barbearias" }}
      usuario={{ nome: sessao.nome, papel: ROTULO_PAPEL[sessao.role] }}
      inicio="/super-admin"
      grupos={[{ titulo: "Plataforma", itens: [visaoGeral, barbearias] }]}
      navInferior={{ principais: [visaoGeral, barbearias], demais: [] }}
    >
      {children}
    </Shell>
  );
}
