import type { CSSProperties } from "react";
import Link from "next/link";
import { Percent, Receipt, Wallet } from "lucide-react";
import type { AtendimentoComissao } from "@/lib/comissoes";
import { totalizar } from "@/lib/comissoes";
import { formatarDataInstante, formatarHora, formatarMoeda } from "@/lib/formatar";
import { Indicador } from "@/components/ui/indicador";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Alerta } from "@/components/ui/alerta";

// Extrato de um profissional: cada atendimento concluído no período, com o
// que entrou no caixa e a comissão guardada na conclusão. O barbeiro vê o
// próprio; o dono vê o de qualquer um.
export function ExtratoComissoes({
  atendimentos,
  visaoDoDono,
}: {
  atendimentos: AtendimentoComissao[];
  visaoDoDono: boolean;
}) {
  const total = totalizar(atendimentos);
  const comComissao = total.atendimentos - total.semPercentual;
  const media = comComissao > 0 ? total.comissao / comComissao : 0;

  return (
    <>
      <section
        className="indicadores"
        style={{ "--indicadores-colunas": 3 } as CSSProperties}
        aria-label="Resumo da comissão"
      >
        <Indicador
          rotulo="Comissão do período"
          valor={formatarMoeda(total.comissao)}
          icone={<Percent size={22} />}
          tomIcone="primario"
          detalhe={`${total.atendimentos} ${total.atendimentos === 1 ? "atendimento concluído" : "atendimentos concluídos"}`}
        />
        <Indicador
          rotulo="Média por atendimento"
          valor={formatarMoeda(media)}
          icone={<Receipt size={22} />}
          detalhe="Por atendimento com comissão"
        />
        <Indicador
          rotulo="Faturamento dos atendimentos"
          valor={formatarMoeda(total.faturamento)}
          icone={<Wallet size={22} />}
          detalhe="O que entrou no caixa por eles"
        />
      </section>

      {total.semPercentual > 0 && (
        <Alerta tom="atencao">
          {total.semPercentual === 1 ? "1 atendimento ficou" : `${total.semPercentual} atendimentos ficaram`} sem
          comissão porque não havia percentual definido na hora da conclusão.{" "}
          {visaoDoDono ? (
            <>
              Defina em{" "}
              <Link href="/painel/equipe" className="link">
                Equipe
              </Link>{" "}
              ou em{" "}
              <Link href="/painel/servicos" className="link">
                Serviços
              </Link>
              .
            </>
          ) : (
            "Fale com o dono da barbearia."
          )}
        </Alerta>
      )}

      <section className="card card-sem-padding" aria-labelledby="titulo-extrato">
        <div className="card-cabecalho">
          <div>
            <h2 id="titulo-extrato" className="card-titulo">
              Atendimentos
            </h2>
            <p className="card-descricao">
              A comissão é calculada sobre o valor cheio do serviço, com o percentual que valia na conclusão.
            </p>
          </div>
        </div>

        {atendimentos.length === 0 ? (
          <EstadoVazio
            icone={<Percent size={22} />}
            titulo="Nenhum atendimento concluído neste período"
            descricao="Os atendimentos aparecem aqui quando são concluídos na Agenda."
          />
        ) : (
          <div className="tabela-wrap">
            <table className="tabela tabela-responsiva">
              <thead>
                <tr>
                  <th scope="col">Atendimento</th>
                  <th scope="col">Serviço</th>
                  <th scope="col" className="alinhar-direita">
                    Recebido
                  </th>
                  <th scope="col" className="alinhar-direita">
                    Comissão
                  </th>
                </tr>
              </thead>
              <tbody>
                {atendimentos.map((a) => (
                  <tr key={a.id}>
                    <td className="tabela-td-principal">
                      <p className="tabela-celula-principal">{a.cliente}</p>
                      <p className="texto-secundario texto-pequeno num">
                        {formatarDataInstante(a.inicio, { day: "2-digit", month: "2-digit" })} às {formatarHora(a.inicio)}
                      </p>
                    </td>
                    <td data-rotulo="Serviço">{a.servico}</td>
                    <td data-rotulo="Recebido" className="alinhar-direita num">
                      {formatarMoeda(a.recebido)}
                    </td>
                    <td data-rotulo="Comissão" className="alinhar-direita num">
                      {a.comissao === null ? (
                        <span className="texto-secundario">Sem %</span>
                      ) : (
                        <>
                          <span className="tabela-celula-principal">{formatarMoeda(a.comissao)}</span>
                          <span className="texto-secundario texto-pequeno">
                            {" "}
                            · {a.percentual?.toLocaleString("pt-BR")}%
                          </span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
