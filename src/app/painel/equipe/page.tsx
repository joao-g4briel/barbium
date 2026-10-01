import type { Metadata } from "next";
import type { DiaSemana, ExpedienteDia } from "@prisma/client";
import Link from "next/link";
import { Pencil, Plus, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { ORDEM_DIAS_SEMANA, ROTULO_DIA_SEMANA } from "@/lib/dias-semana";
import { ROTULO_PAPEL, formatarDuracao } from "@/lib/formatar";
import { obterOcupacaoSemana } from "@/lib/dashboard-painel";
import { obterBarbearia } from "@/lib/barbearia-atual";
import { LIMITE_PROFISSIONAIS, ROTULO_PLANO, cabeMaisUm, mensagemLimite } from "@/lib/planos";
import { Alerta } from "@/components/ui/alerta";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Equipe" };

function resumoExpediente(expediente: ExpedienteDia[]): { dias: string; horario: string | null } {
  const porDia = new Map<DiaSemana, ExpedienteDia>(expediente.map((e) => [e.diaSemana, e]));
  const atende = ORDEM_DIAS_SEMANA.filter((d) => porDia.get(d)?.atende);
  if (atende.length === 0) return { dias: "Sem expediente cadastrado", horario: null };

  const dias = atende.map((d) => ROTULO_DIA_SEMANA[d].slice(0, 3)).join(", ");
  const horarios = new Set(atende.map((d) => `${porDia.get(d)!.horaInicio}–${porDia.get(d)!.horaFim}`));
  return { dias, horario: horarios.size === 1 ? [...horarios][0] : "Horários variam por dia" };
}

export default async function PaginaEquipe() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo="Equipe" />
        <AcessoRestrito descricao="A visão da equipe é exclusiva do dono da barbearia." />
      </>
    );
  }

  const [profissionais, ocupacao, barbearia] = await Promise.all([
    prisma.usuario.findMany({
      where: { barbeariaId: sessao.barbeariaId, role: { in: ["DONO", "BARBEIRO"] } },
      include: { expediente: true },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    }),
    obterOcupacaoSemana(sessao.barbeariaId),
    obterBarbearia(sessao.barbeariaId),
  ]);

  const ativos = profissionais.filter((p) => p.ativo).length;
  const plano = barbearia?.plano ?? "SOLO";
  const limite = LIMITE_PROFISSIONAIS[plano];
  const podeCadastrar = cabeMaisUm(plano, ativos);
  const usoDoPlano =
    limite === null
      ? `${ativos} ${ativos === 1 ? "profissional ativo" : "profissionais ativos"} · plano ${ROTULO_PLANO[plano]}`
      : `${ativos} de ${limite} ${limite === 1 ? "profissional" : "profissionais"} do plano ${ROTULO_PLANO[plano]}`;

  return (
    <>
      <CabecalhoPagina
        titulo="Equipe"
        descricao={`${usoDoPlano} · ocupação da semana atual`}
        acoes={
          podeCadastrar && (
          <Link href="/painel/equipe/novo" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Novo profissional
          </Link>
          )
        }
      />

      {!podeCadastrar && (
        <div style={{ marginBottom: 16 }}>
          <Alerta tom="info">{mensagemLimite(plano)}</Alerta>
        </div>
      )}

      <section className="card card-sem-padding" aria-label="Profissionais">
        {profissionais.length === 0 ? (
          <EstadoVazio icone={<UsersRound size={22} />} titulo="Nenhum profissional cadastrado" />
        ) : (
          <div className="tabela-wrap">
            <table className="tabela tabela-responsiva">
              <thead>
                <tr>
                  <th scope="col">Profissional</th>
                  <th scope="col">Expediente</th>
                  <th scope="col" className="alinhar-direita">
                    Comissão
                  </th>
                  <th scope="col" style={{ minWidth: 200 }}>
                    Ocupação da semana
                  </th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {profissionais.map((p) => {
                  const expediente = resumoExpediente(p.expediente);
                  const ocupado = ocupacao.get(p.id);
                  return (
                    <tr key={p.id}>
                      <td className="tabela-td-principal">
                        <div className="tabela-celula-link">
                          <Avatar nome={p.nome} tamanho={36} />
                          <div style={{ minWidth: 0 }}>
                            <p className="tabela-celula-principal" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              {p.nome}
                              <Badge tom={p.role === "DONO" ? "info" : "neutro"}>{ROTULO_PAPEL[p.role]}</Badge>
                              {!p.ativo && <Badge tom="atencao">Inativo</Badge>}
                            </p>
                            <p className="texto-secundario texto-pequeno" style={{ overflowWrap: "anywhere" }}>
                              {p.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td data-rotulo="Expediente">
                        <div style={{ textAlign: "inherit" }}>
                          <p>{expediente.dias}</p>
                          {expediente.horario && <p className="texto-secundario texto-pequeno num">{expediente.horario}</p>}
                        </div>
                      </td>
                      <td data-rotulo="Comissão" className="alinhar-direita">
                        {p.comissaoPercentual != null ? (
                          `${Number(p.comissaoPercentual).toLocaleString("pt-BR")}%`
                        ) : (
                          <span className="texto-secundario">—</span>
                        )}
                      </td>
                      <td data-rotulo="Ocupação">
                        {ocupado && ocupado.minutosCapacidade > 0 ? (
                          <div style={{ display: "grid", gap: 6, minWidth: 160, flex: 1, maxWidth: 260 }}>
                            <div
                              className="barra-progresso"
                              role="meter"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(ocupado.percentual)}
                              aria-label={`Ocupação de ${p.nome}`}
                            >
                              <div className="barra-progresso-preenchimento" style={{ width: `${ocupado.percentual}%` }} />
                            </div>
                            <p className="texto-secundario texto-pequeno num">
                              {Math.round(ocupado.percentual)}% · {formatarDuracao(ocupado.minutosOcupados)} de{" "}
                              {formatarDuracao(ocupado.minutosCapacidade)}
                            </p>
                          </div>
                        ) : (
                          <span className="texto-secundario texto-pequeno">Sem expediente para calcular</span>
                        )}
                      </td>
                      <td className="alinhar-direita">
                        <Link href={`/painel/equipe/${p.id}`} className="btn btn-ghost btn-sm">
                          <Pencil size={15} aria-hidden="true" />
                          Editar<span className="sr-only"> {p.nome}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="texto-secundario texto-pequeno" style={{ marginTop: 16 }}>
        Cada profissional define o próprio expediente em “Meus horários”.
      </p>
    </>
  );
}
