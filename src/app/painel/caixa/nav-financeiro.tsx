import { Abas } from "@/components/ui/abas";
import type { PeriodoCaixa } from "@/lib/periodo-caixa";

// Seções do Financeiro. O período escolhido acompanha a troca de seção.
export function NavFinanceiro({ atual, periodo }: { atual: "lancamentos" | "comissoes"; periodo: PeriodoCaixa }) {
  return (
    <Abas
      rotulo="Seções do financeiro"
      itens={[
        { href: `/painel/caixa?periodo=${periodo}`, rotulo: "Lançamentos", ativo: atual === "lancamentos" },
        { href: `/painel/caixa/comissoes?periodo=${periodo}`, rotulo: "Comissões", ativo: atual === "comissoes" },
      ]}
    />
  );
}
