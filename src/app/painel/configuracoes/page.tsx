import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, Clock, ExternalLink } from "lucide-react";
import { obterSessao } from "@/lib/sessao";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { ROTULO_PLANO } from "@/lib/planos";
import { ROTULO_PAPEL, formatarTelefone } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { CopiarTexto } from "@/components/ui/copiar-texto";
import { Avatar } from "@/components/ui/avatar";
import { BotaoSair } from "@/components/botao-sair";

export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const barbearia = await obterBarbearia(sessao.barbeariaId);
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const linkPublico = barbearia ? `${protocolo}://${host}/agendar/${barbearia.slug}` : null;

  return (
    <>
      <CabecalhoPagina titulo="Configurações" descricao="Dados da barbearia, seu perfil e sua sessão." />

      <div className="grade-painel grade-painel-1-1">
        <div className="pilha">
          <section className="card" aria-labelledby="titulo-barbearia">
            <div className="card-cabecalho">
              <div>
                <h2 id="titulo-barbearia" className="card-titulo">
                  Barbearia
                </h2>
                <p className="card-descricao">Definidos no cadastro da barbearia na plataforma.</p>
              </div>
            </div>
            {barbearia && (
              <dl className="fatos">
                <div>
                  <dt>Nome</dt>
                  <dd>{barbearia.nome}</dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{barbearia.telefone ? formatarTelefone(barbearia.telefone) : "Não informado"}</dd>
                </div>
                <div>
                  <dt>Plano</dt>
                  <dd>{ROTULO_PLANO[barbearia.plano]}</dd>
                </div>
              </dl>
            )}
          </section>

          {linkPublico && (
            <section className="card" aria-labelledby="titulo-link">
              <div className="card-cabecalho">
                <div>
                  <h2 id="titulo-link" className="card-titulo">
                    Link de agendamento
                  </h2>
                  <p className="card-descricao">Envie para os clientes marcarem horário sozinhos.</p>
                </div>
              </div>
              <p
                className="num"
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  overflowWrap: "anywhere",
                  fontWeight: 600,
                }}
              >
                {linkPublico}
              </p>
              <div className="form-acoes" style={{ marginTop: 12 }}>
                <CopiarTexto texto={linkPublico} rotulo="Copiar link" />
                <a href={`/agendar/${barbearia!.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                  <ExternalLink size={16} aria-hidden="true" />
                  Abrir página
                </a>
              </div>
            </section>
          )}
        </div>

        <div className="pilha">
          <section className="card" aria-labelledby="titulo-perfil">
            <div className="card-cabecalho">
              <h2 id="titulo-perfil" className="card-titulo">
                Seu perfil
              </h2>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <Avatar nome={sessao.nome} tamanho={48} />
              <div>
                <p style={{ fontWeight: 700 }}>{sessao.nome}</p>
                <p className="texto-secundario texto-pequeno">{ROTULO_PAPEL[sessao.role]}</p>
              </div>
            </div>
            <div className="lista" style={{ margin: "0 -20px -20px", borderTop: "1px solid var(--color-border)" }}>
              <Link href="/painel/disponibilidade" className="lista-item">
                <Clock size={20} className="texto-secundario" aria-hidden="true" />
                <div className="lista-item-principal">
                  <p className="lista-item-titulo">Meus horários</p>
                  <p className="lista-item-sub">Expediente, folgas e trava da agenda</p>
                </div>
                <ChevronRight size={18} className="lista-item-chevron" aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="card" aria-labelledby="titulo-sessao">
            <div className="card-cabecalho">
              <div>
                <h2 id="titulo-sessao" className="card-titulo">
                  Sessão
                </h2>
                <p className="card-descricao">Encerra o acesso neste aparelho.</p>
              </div>
            </div>
            <BotaoSair />
          </section>
        </div>
      </div>
    </>
  );
}
