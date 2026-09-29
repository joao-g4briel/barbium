import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, CalendarX2, CheckCircle2, History, MessageCircle, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import {
  formatarDataInstante,
  formatarHora,
  formatarTelefone,
  linkWhatsApp,
  apenasDigitos,
} from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { Indicador } from "@/components/ui/indicador";
import { StatusBadge } from "@/components/ui/badge";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FormularioEditarCliente } from "./formulario-editar-cliente";
import { SecaoAssinatura } from "./secao-assinatura";
import { BotaoExcluirCliente } from "./botao-excluir-cliente";

export const metadata: Metadata = { title: "Cliente" };

export default async function DetalheCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente || cliente.barbeariaId !== sessao.barbeariaId) notFound();

  const [agendamentos, totalAgendamentos, totalConcluidos, ultimoConcluido] = await Promise.all([
    prisma.agendamento.findMany({
      where: { clienteId: cliente.id },
      orderBy: { inicio: "desc" },
      take: 10,
      include: { servico: true, barbeiro: true },
    }),
    prisma.agendamento.count({ where: { clienteId: cliente.id } }),
    prisma.agendamento.count({ where: { clienteId: cliente.id, status: "CONCLUIDO" } }),
    prisma.agendamento.findFirst({
      where: { clienteId: cliente.id, status: "CONCLUIDO" },
      orderBy: { inicio: "desc" },
      select: { inicio: true },
    }),
  ]);

  const souDono = sessao.role === "DONO";
  const whatsapp = linkWhatsApp(cliente.telefone);
  const telefoneDigitos = apenasDigitos(cliente.telefone);

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/painel/clientes", rotulo: "Clientes" }}
        titulo={cliente.nome}
        descricao={<span className="num">{formatarTelefone(cliente.telefone)}</span>}
        acoes={
          <>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <MessageCircle size={18} aria-hidden="true" />
                WhatsApp
              </a>
            )}
            {telefoneDigitos.length >= 8 && (
              <a href={`tel:${telefoneDigitos}`} className="btn btn-secondary">
                <Phone size={18} aria-hidden="true" />
                Ligar
              </a>
            )}
          </>
        }
      />

      <div className="pilha">
        <section className="indicadores" style={{ "--indicadores-colunas": 3 } as React.CSSProperties} aria-label="Resumo do cliente">
          <Indicador rotulo="Agendamentos" valor={totalAgendamentos} icone={<CalendarCheck size={22} />} />
          <Indicador rotulo="Concluídos" valor={totalConcluidos} icone={<CheckCircle2 size={22} />} tomIcone="primario" />
          <Indicador
            rotulo="Último atendimento"
            valor={ultimoConcluido ? formatarDataInstante(ultimoConcluido.inicio) : "—"}
            icone={<History size={22} />}
          />
        </section>

        <div className="grade-painel grade-painel-2-1">
          <section className="card card-sem-padding" aria-labelledby="titulo-historico">
            <div className="card-cabecalho">
              <div>
                <h2 id="titulo-historico" className="card-titulo">
                  Histórico de atendimentos
                </h2>
                {totalAgendamentos > agendamentos.length && (
                  <p className="card-descricao">Mostrando os {agendamentos.length} mais recentes</p>
                )}
              </div>
            </div>
            {agendamentos.length === 0 ? (
              <EstadoVazio
                compacto
                icone={<CalendarX2 size={22} />}
                titulo="Nenhum agendamento ainda"
                descricao="Os atendimentos desse cliente vão aparecer aqui."
              />
            ) : (
              <div className="lista">
                {agendamentos.map((agendamento) => (
                  <div key={agendamento.id} className="lista-item">
                    <div className="lista-item-principal">
                      <p className="lista-item-titulo num">
                        {formatarDataInstante(agendamento.inicio)} às {formatarHora(agendamento.inicio)}
                      </p>
                      <p className="lista-item-sub">
                        {agendamento.servico.nome} · {agendamento.barbeiro.nome}
                      </p>
                    </div>
                    <StatusBadge status={agendamento.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="pilha">
            {souDono ? (
              <section className="card" aria-labelledby="titulo-dados">
                <div className="card-cabecalho">
                  <h2 id="titulo-dados" className="card-titulo">
                    Dados do cliente
                  </h2>
                </div>
                <FormularioEditarCliente
                  clienteId={cliente.id}
                  nomeInicial={cliente.nome}
                  telefoneInicial={cliente.telefone}
                />
              </section>
            ) : (
              <section className="card" aria-labelledby="titulo-dados">
                <div className="card-cabecalho">
                  <h2 id="titulo-dados" className="card-titulo">
                    Dados do cliente
                  </h2>
                </div>
                <dl className="fatos">
                  <div>
                    <dt>Nome</dt>
                    <dd>{cliente.nome}</dd>
                  </div>
                  <div>
                    <dt>Telefone</dt>
                    <dd>{formatarTelefone(cliente.telefone)}</dd>
                  </div>
                </dl>
              </section>
            )}

            {souDono && (
              <SecaoAssinatura
                clienteId={cliente.id}
                tipoAtual={cliente.assinaturaTipo}
                valorAtual={cliente.assinaturaValor != null ? Number(cliente.assinaturaValor) : null}
                vencimentoAtual={cliente.assinaturaVencimento?.toISOString() ?? null}
              />
            )}

            {souDono && (
              <section className="card" aria-labelledby="titulo-excluir">
                <div className="card-cabecalho" style={{ marginBottom: 8 }}>
                  <h2 id="titulo-excluir" className="card-titulo">
                    Excluir cliente
                  </h2>
                </div>
                <p className="texto-secundario texto-pequeno" style={{ marginBottom: 16 }}>
                  Remove o cliente e todo o histórico de agendamentos dele.
                </p>
                <BotaoExcluirCliente clienteId={cliente.id} nome={cliente.nome} totalAgendamentos={totalAgendamentos} />
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
