import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleSlash, Pencil, Plus, Repeat, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { formatarDataInstante, formatarMoeda, formatarTelefone } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Alerta } from "@/components/ui/alerta";
import { AcessoRestrito } from "@/components/ui/acesso-restrito";
import { usosNoMes } from "@/lib/planos-corte";
import { linkDaAssinatura } from "@/lib/link-cliente";
import {
  ROTULO_SITUACAO_ASSINATURA,
  descreverUsos,
  mesDoPlano,
  situacaoAssinatura,
  type SituacaoAssinatura,
} from "@/lib/planos-corte-regras";
import type { TomBadge } from "@/lib/status-agendamento";
import { AcoesAssinante } from "./acoes-assinante";

export const metadata: Metadata = { title: "Planos de corte" };

const TOM_SITUACAO: Record<SituacaoAssinatura, TomBadge> = {
  ATIVA: "sucesso",
  AGUARDANDO_PAGAMENTO: "atencao",
  VENCIDA: "perigo",
  CANCELADA: "neutro",
};

export default async function PaginaPlanos() {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;
  if (sessao.role !== "DONO") {
    return (
      <>
        <CabecalhoPagina titulo="Planos de corte" />
        <AcessoRestrito descricao="Só o dono da barbearia vê e gerencia os planos de corte." />
      </>
    );
  }
  const barbeariaId = sessao.barbeariaId;
  const fuso = sessao.fuso;

  const [planos, assinaturas, pagamento] = await Promise.all([
    prisma.planoCorte.findMany({
      where: { barbeariaId },
      orderBy: [{ ativo: "desc" }, { valor: "asc" }],
      include: {
        servicos: { include: { servico: { select: { nome: true } } } },
        _count: { select: { assinaturas: { where: { canceladaEm: null, validaAte: { gt: new Date() } } } } },
      },
    }),
    prisma.assinaturaPlano.findMany({
      where: { barbeariaId, canceladaEm: null },
      orderBy: [{ validaAte: "asc" }],
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        plano: { select: { nome: true, valor: true, usosPorMes: true } },
      },
    }),
    prisma.configuracaoPagamento.findUnique({ where: { barbeariaId }, select: { mpAccessTokenCifrado: true } }),
  ]);

  const agora = new Date();
  const linhas = await Promise.all(
    assinaturas.map(async (a) => {
      const situacao = situacaoAssinatura(a, agora);
      const mes = situacao === "ATIVA" && a.validaAte ? mesDoPlano(a.validaAte, agora) : null;
      const usados = mes ? await usosNoMes(prisma, a.id, mes) : null;
      return { ...a, situacao, usados, link: linkDaAssinatura(a.id) };
    }),
  );
  const mpConectado = Boolean(pagamento?.mpAccessTokenCifrado);
  const ativos = linhas.filter((l) => l.situacao === "ATIVA").length;

  return (
    <>
      <CabecalhoPagina
        titulo="Planos de corte"
        descricao="Planos mensais que seus clientes assinam e usam no link de agendamento"
        acoes={
          <Link href="/painel/planos/novo" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Novo plano
          </Link>
        }
      />

      {planos.length > 0 && !mpConectado && (
        <Alerta tom="info">
          Para o cliente assinar e pagar pelo Pix no link de agendamento, conecte o Mercado Pago em{" "}
          <Link href="/painel/configuracoes" className="link">
            Configurações
          </Link>
          . Enquanto isso, os planos aparecem no link e você registra os pagamentos aqui, no balcão.
        </Alerta>
      )}

      <section className="card card-sem-padding" aria-labelledby="titulo-planos">
        <div className="card-cabecalho">
          <h2 id="titulo-planos" className="card-titulo">
            Planos
          </h2>
        </div>
        {planos.length === 0 ? (
          <EstadoVazio
            icone={<Repeat size={22} />}
            titulo="Nenhum plano criado"
            descricao="Crie um plano, como 4 cortes por mês, e ele aparece no seu link de agendamento para o cliente assinar."
            acao={
              <Link href="/painel/planos/novo" className="btn btn-primary">
                <Plus size={18} aria-hidden="true" />
                Criar plano
              </Link>
            }
          />
        ) : (
          <div className="tabela-wrap">
            <table className="tabela tabela-responsiva">
              <thead>
                <tr>
                  <th scope="col">Plano</th>
                  <th scope="col" className="alinhar-direita">
                    Valor por mês
                  </th>
                  <th scope="col">Inclui</th>
                  <th scope="col" className="alinhar-direita">
                    Comissão
                  </th>
                  <th scope="col" className="alinhar-direita">
                    Assinantes
                  </th>
                  <th scope="col">Situação</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {planos.map((plano) => (
                  <tr key={plano.id}>
                    <td className="tabela-td-principal tabela-celula-principal">{plano.nome}</td>
                    <td data-rotulo="Valor por mês" className="alinhar-direita num">
                      {formatarMoeda(Number(plano.valor))}
                    </td>
                    <td data-rotulo="Inclui">
                      {/* Um bloco só: no celular a célula vira linha com rótulo. */}
                      <span>
                        {plano.servicos.map((s) => s.servico.nome).join(", ")}
                        <span className="texto-secundario texto-pequeno"> · {descreverUsos(plano.usosPorMes)}</span>
                      </span>
                    </td>
                    <td data-rotulo="Comissão" className="alinhar-direita num">
                      {Number(plano.comissaoValor) > 0 ? (
                        formatarMoeda(Number(plano.comissaoValor))
                      ) : (
                        <span className="texto-secundario">—</span>
                      )}
                    </td>
                    <td data-rotulo="Assinantes" className="alinhar-direita num">
                      {plano._count.assinaturas}
                    </td>
                    <td data-rotulo="Situação">
                      {plano.ativo ? (
                        <Badge tom="sucesso" icone={<CheckCircle2 size={13} aria-hidden="true" />}>
                          À venda
                        </Badge>
                      ) : (
                        <Badge icone={<CircleSlash size={13} aria-hidden="true" />}>Desativado</Badge>
                      )}
                    </td>
                    <td className="alinhar-direita">
                      <Link href={`/painel/planos/${plano.id}`} className="btn btn-ghost btn-sm">
                        <Pencil size={15} aria-hidden="true" />
                        Editar<span className="sr-only"> {plano.nome}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {planos.length > 0 && (
        <section className="card card-sem-padding" aria-labelledby="titulo-assinantes" style={{ marginTop: 24 }}>
          <div className="card-cabecalho">
            <div>
              <h2 id="titulo-assinantes" className="card-titulo">
                Assinantes
              </h2>
              <p className="card-descricao">
                {ativos} {ativos === 1 ? "assinatura ativa" : "assinaturas ativas"}
              </p>
            </div>
            <Link href="/painel/planos/assinantes/novo" className="btn btn-secondary btn-sm">
              <UserPlus size={16} aria-hidden="true" />
              Adicionar assinante
            </Link>
          </div>
          {linhas.length === 0 ? (
            <EstadoVazio
              icone={<UserPlus size={22} />}
              titulo="Nenhum assinante ainda"
              descricao="Quem assinar pelo link de agendamento aparece aqui. Se o cliente pagar no balcão, adicione você mesmo."
            />
          ) : (
            <div className="tabela-wrap">
              <table className="tabela tabela-responsiva">
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">Plano</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Vale até</th>
                    <th scope="col">Uso no mês</th>
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((a) => (
                    <tr key={a.id}>
                      <td className="tabela-td-principal tabela-celula-principal">
                        <Link href={`/painel/clientes/${a.cliente.id}`} className="link">
                          {a.cliente.nome}
                        </Link>
                        <span className="texto-secundario texto-pequeno num" style={{ display: "block" }}>
                          {formatarTelefone(a.cliente.telefone)}
                        </span>
                      </td>
                      <td data-rotulo="Plano">
                        <span>
                          {a.plano.nome}
                          {a.mpPreapprovalId && (
                            <span className="texto-secundario texto-pequeno" style={{ display: "block" }}>
                              {a.cartaoStatus === "authorized"
                                ? "Cartão · renova sozinho"
                                : a.cartaoStatus === "cancelled"
                                  ? "Cartão · renovação cancelada"
                                  : "Cartão · aguardando o cliente"}
                            </span>
                          )}
                        </span>
                      </td>
                      <td data-rotulo="Situação">
                        <Badge tom={TOM_SITUACAO[a.situacao]}>{ROTULO_SITUACAO_ASSINATURA[a.situacao]}</Badge>
                      </td>
                      <td data-rotulo="Vale até" className="num">
                        {a.validaAte ? formatarDataInstante(a.validaAte, { day: "2-digit", month: "2-digit", year: "numeric" }, fuso) : "—"}
                      </td>
                      <td data-rotulo="Uso no mês" className="num">
                        {a.usados === null
                          ? "—"
                          : a.plano.usosPorMes === null
                            ? `${a.usados} ${a.usados === 1 ? "atendimento" : "atendimentos"}`
                            : `${a.usados} de ${a.plano.usosPorMes}`}
                      </td>
                      <td className="alinhar-direita">
                        <AcoesAssinante
                          assinaturaId={a.id}
                          cliente={a.cliente.nome}
                          plano={a.plano.nome}
                          valor={Number(a.plano.valor)}
                          link={a.link}
                          renovaNoCartao={a.cartaoStatus === "authorized"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
