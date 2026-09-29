import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { ROTULO_PAPEL } from "@/lib/formatar";
import { ROTULO_PLANO } from "@/lib/planos";
import { Shell } from "@/components/app/shell";
import type { GrupoNav, ItemNav } from "@/components/app/navegacao";

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();
  if (!sessao || (sessao.role !== "DONO" && sessao.role !== "BARBEIRO") || !sessao.barbeariaId) {
    redirect("/login");
  }

  const barbearia = await obterBarbearia(sessao.barbeariaId);
  const souDono = sessao.role === "DONO";

  const visaoGeral: ItemNav = { href: "/painel", rotulo: "Visão geral", icone: "inicio" };
  const agenda: ItemNav = { href: "/painel/agenda", rotulo: "Agenda", icone: "agenda" };
  const clientes: ItemNav = { href: "/painel/clientes", rotulo: "Clientes", icone: "clientes" };
  const equipe: ItemNav = { href: "/painel/equipe", rotulo: "Equipe", icone: "equipe" };
  const servicos: ItemNav = { href: "/painel/servicos", rotulo: "Serviços", icone: "servicos" };
  const financeiro: ItemNav = { href: "/painel/caixa", rotulo: "Financeiro", icone: "financeiro" };
  const horarios: ItemNav = { href: "/painel/disponibilidade", rotulo: "Meus horários", icone: "horarios" };
  const configuracoes: ItemNav = { href: "/painel/configuracoes", rotulo: "Configurações", icone: "configuracoes" };

  const grupos: GrupoNav[] = [
    { itens: [visaoGeral, agenda, clientes] },
    { titulo: "Barbearia", itens: souDono ? [equipe, servicos, financeiro] : [servicos] },
    { titulo: "Conta", itens: [horarios, configuracoes] },
  ];

  const inicio = { ...visaoGeral, rotulo: "Início" };
  const principais = souDono ? [inicio, agenda, clientes, financeiro] : [inicio, agenda, clientes, horarios];
  const demais = souDono
    ? [servicos, equipe, horarios, configuracoes]
    : [servicos, configuracoes];

  return (
    <Shell
      variante="barbearia"
      contexto={{
        nome: barbearia?.nome ?? "Sua barbearia",
        detalhe: barbearia ? `Plano ${ROTULO_PLANO[barbearia.plano]}` : "",
      }}
      usuario={{ nome: sessao.nome, papel: ROTULO_PAPEL[sessao.role] }}
      inicio="/painel"
      perfilHref="/painel/configuracoes"
      grupos={grupos}
      navInferior={{ principais, demais }}
    >
      {children}
    </Shell>
  );
}
