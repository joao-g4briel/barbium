"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock,
  House,
  LayoutDashboard,
  MoreHorizontal,
  Scissors,
  Settings,
  Store,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Dialogo } from "@/components/ui/dialogo";
import { BotaoSair } from "@/components/botao-sair";

const ICONES = {
  inicio: House,
  painel: LayoutDashboard,
  agenda: CalendarDays,
  clientes: Users,
  equipe: UsersRound,
  servicos: Scissors,
  financeiro: Wallet,
  horarios: Clock,
  configuracoes: Settings,
  barbearias: Store,
} as const;

export type NomeIcone = keyof typeof ICONES;

export interface ItemNav {
  href: string;
  rotulo: string;
  icone: NomeIcone;
}

export interface GrupoNav {
  titulo?: string;
  itens: ItemNav[];
}

// O item ativo é o mais específico que casa com a rota — senão "/painel"
// ficaria marcado junto com "/painel/clientes".
function hrefAtivo(pathname: string, itens: ItemNav[]): string | undefined {
  return [...itens]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;
}

export function NavLateral({ grupos }: { grupos: GrupoNav[] }) {
  const pathname = usePathname();
  const ativo = hrefAtivo(pathname, grupos.flatMap((g) => g.itens));

  return (
    <nav className="nav-lateral" aria-label="Navegação principal">
      {grupos.map((grupo, indice) => (
        <div key={grupo.titulo ?? indice} className="nav-grupo">
          {grupo.titulo && <p className="nav-grupo-titulo">{grupo.titulo}</p>}
          {grupo.itens.map((item) => {
            const Icone = ICONES[item.icone];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item"
                aria-current={ativo === item.href ? "page" : undefined}
              >
                <Icone size={20} strokeWidth={1.9} aria-hidden="true" />
                {item.rotulo}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function NavInferior({ principais, demais }: { principais: ItemNav[]; demais: ItemNav[] }) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const ativo = hrefAtivo(pathname, [...principais, ...demais]);
  const maisAtivo = demais.some((item) => item.href === ativo);

  return (
    <>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {principais.map((item) => {
          const Icone = ICONES[item.icone];
          return (
            <Link
              key={item.href}
              href={item.href}
              className="bottom-nav-item"
              aria-current={ativo === item.href ? "page" : undefined}
            >
              <Icone size={22} strokeWidth={1.9} aria-hidden="true" />
              {item.rotulo}
            </Link>
          );
        })}
        <button
          type="button"
          className="bottom-nav-item"
          aria-current={maisAtivo ? "page" : undefined}
          aria-haspopup="dialog"
          onClick={() => setMaisAberto(true)}
        >
          <MoreHorizontal size={22} strokeWidth={1.9} aria-hidden="true" />
          Mais
        </button>
      </nav>

      <Dialogo aberto={maisAberto} aoFechar={() => setMaisAberto(false)} titulo="Mais opções">
        <nav className="menu-mais" aria-label="Outras seções">
          {demais.map((item) => {
            const Icone = ICONES[item.icone];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item"
                aria-current={ativo === item.href ? "page" : undefined}
                onClick={() => setMaisAberto(false)}
              >
                <Icone size={20} strokeWidth={1.9} aria-hidden="true" />
                {item.rotulo}
              </Link>
            );
          })}
          <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 8, paddingTop: 8 }}>
            <BotaoSair variante="menu" />
          </div>
        </nav>
      </Dialogo>
    </>
  );
}
