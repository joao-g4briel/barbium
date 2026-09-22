"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, Scissors, UserPlus, Wallet, LayoutDashboard, Store } from "lucide-react";

const MAPA_ICONES = {
  calendar: Calendar,
  users: Users,
  scissors: Scissors,
  "user-plus": UserPlus,
  wallet: Wallet,
  "layout-dashboard": LayoutDashboard,
  store: Store,
} as const;

export type NomeIcone = keyof typeof MAPA_ICONES;

export interface ItemNavInferior {
  href: string;
  rotulo: string;
  icone: NomeIcone;
}

export function NavInferior({ itens }: { itens: ItemNavInferior[] }) {
  const pathname = usePathname();

  // Escolhe o item mais específico que casa com a rota atual, senão
  // "/painel" e "/painel/servicos" ficariam os dois marcados como ativos
  // ao mesmo tempo.
  const itemAtivo = [...itens]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {itens.map(({ href, rotulo, icone }) => {
        const Icone = MAPA_ICONES[icone];
        return (
          <Link key={href} href={href} className={itemAtivo?.href === href ? "ativo" : undefined}>
            <Icone size={22} strokeWidth={1.8} />
            <span>{rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
