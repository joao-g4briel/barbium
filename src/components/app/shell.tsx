import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";
import { Marca } from "@/components/ui/marca";
import { Avatar } from "@/components/ui/avatar";
import { BotaoSair } from "@/components/botao-sair";
import { NavInferior, NavLateral, type GrupoNav, type ItemNav } from "./navegacao";

interface ShellProps {
  variante: "barbearia" | "plataforma";
  contexto: { nome: string; detalhe: string };
  usuario: { nome: string; papel: string };
  inicio: string;
  perfilHref?: string;
  grupos: GrupoNav[];
  navInferior: { principais: ItemNav[]; demais: ItemNav[] };
  children: ReactNode;
}

export function Shell({ variante, contexto, usuario, inicio, perfilHref, grupos, navInferior, children }: ShellProps) {
  const IconeContexto = variante === "plataforma" ? ShieldCheck : Building2;

  return (
    <div className="app">
      <aside className="sidebar">
        <Link href={inicio} className="sidebar-marca" aria-label="Barbium — início">
          <Marca variante="sidebar" />
        </Link>

        <div className="contexto-conta">
          <span className="contexto-conta-icone" aria-hidden="true">
            <IconeContexto size={18} />
          </span>
          <div className="contexto-conta-texto">
            <p className="contexto-conta-nome">{contexto.nome}</p>
            <p className="contexto-conta-detalhe">{contexto.detalhe}</p>
          </div>
        </div>

        <NavLateral grupos={grupos} />

        <div className="sidebar-rodape">
          <div className="usuario-resumo">
            <Avatar nome={usuario.nome} tamanho={36} />
            <div className="usuario-resumo-texto">
              <p className="usuario-resumo-nome">{usuario.nome}</p>
              <p className="usuario-resumo-papel">{usuario.papel}</p>
            </div>
            <BotaoSair variante="icone" />
          </div>
        </div>
      </aside>

      <div>
        <header className="topbar">
          <div className="topbar-contexto">
            <Link href={inicio} aria-label="Barbium — início">
              <Marca variante="topbar" tamanho={22} />
            </Link>
            <span className="topbar-barbearia">{contexto.nome}</span>
          </div>
          {perfilHref ? (
            <Link href={perfilHref} aria-label={`Configurações e perfil de ${usuario.nome}`}>
              <Avatar nome={usuario.nome} tamanho={36} />
            </Link>
          ) : (
            <Avatar nome={usuario.nome} tamanho={36} />
          )}
        </header>

        <main className="main" id="conteudo">
          {children}
        </main>
      </div>

      <NavInferior principais={navInferior.principais} demais={navInferior.demais} />
    </div>
  );
}
