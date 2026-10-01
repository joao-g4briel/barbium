import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { obterSessao } from "@/lib/sessao";
import { situacaoDoPlano } from "@/lib/equipe";
import { mensagemLimite } from "@/lib/planos";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FormularioNovoProfissional } from "./formulario-novo-profissional";

export const metadata: Metadata = { title: "Novo profissional" };

export default async function NovoProfissional() {
  const sessao = await obterSessao();
  const situacao = sessao?.role === "DONO" && sessao.barbeariaId ? await situacaoDoPlano(sessao.barbeariaId) : null;

  return (
    <>
      <CabecalhoPagina titulo="Novo profissional" voltar={{ href: "/painel/equipe", rotulo: "Equipe" }} />
      {!situacao ? (
        <AcessoRestrito descricao="Só o dono da barbearia pode cadastrar profissionais." />
      ) : !situacao.cabeMaisUm ? (
        <div className="card" style={{ maxWidth: 640 }}>
          <EstadoVazio
            icone={<UsersRound size={22} />}
            titulo="Limite do plano atingido"
            descricao={mensagemLimite(situacao.plano)}
            acao={
              <Link href="/painel/equipe" className="btn btn-secondary">
                Voltar para a equipe
              </Link>
            }
          />
        </div>
      ) : (
        <FormularioNovoProfissional />
      )}
    </>
  );
}
