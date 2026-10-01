import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight, Clock, ExternalLink } from "lucide-react";
import { obterSessao } from "@/lib/sessao";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { ROTULO_PLANO, descreverLimite } from "@/lib/planos";
import { ROTULO_PAPEL, formatarTelefone } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { CopiarTexto } from "@/components/ui/copiar-texto";
import { Avatar } from "@/components/ui/avatar";
import { BotaoSair } from "@/components/botao-sair";
import { prisma } from "@/lib/prisma";
import { chaveSegredosConfigurada } from "@/lib/segredos";
import { SINAL_PERCENTUAL_MAX, SINAL_PERCENTUAL_MIN } from "@/lib/sinal";
import { SecaoPagamento } from "./secao-pagamento";
import { FormularioBarbearia, FormularioPerfil, FormularioSenha } from "./formularios-conta";

export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const souDono = sessao.role === "DONO";
  const [barbearia, usuario, pagamento] = await Promise.all([
    obterBarbearia(sessao.barbeariaId),
    prisma.usuario.findUnique({ where: { id: sessao.sub }, select: { email: true } }),
    souDono
      ? prisma.configuracaoPagamento.findUnique({
          where: { barbeariaId: sessao.barbeariaId },
          select: { sinalAtivo: true, sinalPercentual: true, mpContaDescricao: true, mpAccessTokenCifrado: true },
        })
      : Promise.resolve(null),
  ]);
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const linkPublico = barbearia ? `${protocolo}://${host}/agendar/${barbearia.slug}` : null;

  return (
    <>
      <CabecalhoPagina
        titulo="Configurações"
        descricao={souDono ? "Dados da barbearia, pagamento, seu perfil e senha." : "Seu perfil, senha e dados da barbearia."}
      />

      <div className="grade-painel grade-painel-1-1">
        <div className="pilha">
          <section className="card" aria-labelledby="titulo-barbearia">
            <div className="card-cabecalho">
              <div>
                <h2 id="titulo-barbearia" className="card-titulo">
                  Barbearia
                </h2>
                <p className="card-descricao">
                  {souDono
                    ? "Nome e telefone aparecem para os clientes. Link e plano são definidos pela plataforma."
                    : "Só o dono da barbearia altera estes dados."}
                </p>
              </div>
            </div>
            {barbearia && souDono && (
              <div className="pilha-sm">
                <FormularioBarbearia
                  nomeInicial={barbearia.nome}
                  telefoneInicial={barbearia.telefone ? formatarTelefone(barbearia.telefone) : ""}
                />
                <dl className="fatos">
                  <div>
                    <dt>Plano</dt>
                    <dd>{ROTULO_PLANO[barbearia.plano]} · {descreverLimite(barbearia.plano)}</dd>
                  </div>
                </dl>
              </div>
            )}
            {barbearia && !souDono && (
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
                  <dd>{ROTULO_PLANO[barbearia.plano]} · {descreverLimite(barbearia.plano)}</dd>
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

          {souDono && (
            <SecaoPagamento
              conectado={Boolean(pagamento?.mpAccessTokenCifrado)}
              contaDescricao={pagamento?.mpContaDescricao ?? null}
              sinalAtivo={pagamento?.sinalAtivo ?? false}
              sinalPercentual={pagamento?.sinalPercentual ?? 50}
              chaveConfigurada={chaveSegredosConfigurada()}
              percentualMin={SINAL_PERCENTUAL_MIN}
              percentualMax={SINAL_PERCENTUAL_MAX}
            />
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
            {usuario && <FormularioPerfil nomeInicial={sessao.nome} emailInicial={usuario.email} />}
            <div className="lista" style={{ margin: "20px -20px -20px", borderTop: "1px solid var(--color-border)" }}>
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

          <section className="card" aria-labelledby="titulo-senha">
            <div className="card-cabecalho">
              <h2 id="titulo-senha" className="card-titulo">
                Senha
              </h2>
            </div>
            <FormularioSenha />
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
