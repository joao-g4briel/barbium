import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { ROTULO_PAPEL } from "@/lib/formatar";
import { ROTULO_PLANO } from "@/lib/planos";
import { Shell } from "@/components/app/shell";
import type { GrupoNav, ItemNav } from "@/components/app/navegacao";
import { AcessoVencido, FaixaTeste } from "@/components/app/aviso-acesso";
import { diasRestantes } from "@/lib/acesso";
import { ProvedorFuso } from "@/components/fuso-contexto";

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
  const indicadores: ItemNav = { href: "/painel/indicadores", rotulo: "Indicadores", icone: "indicadores" };
  // O barbeiro não vê o caixa, só a própria comissão.
  const minhasComissoes: ItemNav = { href: "/painel/caixa/comissoes", rotulo: "Minhas comissões", icone: "financeiro" };
  const horarios: ItemNav = { href: "/painel/disponibilidade", rotulo: "Meus horários", icone: "horarios" };
  const configuracoes: ItemNav = { href: "/painel/configuracoes", rotulo: "Configurações", icone: "configuracoes" };
  const assinatura: ItemNav = { href: "/painel/assinatura", rotulo: "Assinatura", icone: "assinatura" };

  const grupos: GrupoNav[] = [
    { itens: [visaoGeral, agenda, clientes] },
    { titulo: "Barbearia", itens: souDono ? [equipe, servicos, financeiro, indicadores] : [servicos, minhasComissoes] },
    { titulo: "Conta", itens: souDono ? [horarios, assinatura, configuracoes] : [horarios, configuracoes] },
  ];

  const inicio = { ...visaoGeral, rotulo: "Início" };
  const principais = souDono ? [inicio, agenda, clientes, financeiro] : [inicio, agenda, clientes, horarios];
  const demais = souDono
    ? [indicadores, servicos, equipe, horarios, assinatura, configuracoes]
    : [minhasComissoes, servicos, configuracoes];

  return (
    <ProvedorFuso fuso={sessao.fuso}>
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
        {sessao.acessoVencido ? (
          // Teste ou assinatura vencidos: no lugar de qualquer página, como assinar.
          <AcessoVencido souDono={souDono} emTeste={barbearia?.emTeste ?? false} plano={barbearia?.plano ?? "SOLO"} />
        ) : (
          <>
            {barbearia?.emTeste && barbearia.acessoAte && (
              <FaixaTeste dias={diasRestantes(barbearia) ?? 0} souDono={souDono} />
            )}
            {children}
          </>
        )}
      </Shell>
    </ProvedorFuso>
  );
}
