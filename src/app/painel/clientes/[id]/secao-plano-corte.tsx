import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatarDataInstante } from "@/lib/formatar";
import { assinaturaDoCliente, usosNoMes } from "@/lib/planos-corte";
import { ROTULO_SITUACAO_ASSINATURA, mesDoPlano, situacaoAssinatura } from "@/lib/planos-corte-regras";

// Plano de corte do cliente na ficha (só o dono vê). A gestão fica na página
// de planos; aqui só o resumo e o atalho.
export async function SecaoPlanoCorte({ clienteId, barbeariaId, fuso }: { clienteId: string; barbeariaId: string; fuso: string }) {
  const [assinatura, planosAVenda] = await Promise.all([
    assinaturaDoCliente(prisma, clienteId),
    prisma.planoCorte.count({ where: { barbeariaId, ativo: true } }),
  ]);
  if (!assinatura && planosAVenda === 0) return null;

  const agora = new Date();
  const situacao = assinatura ? situacaoAssinatura(assinatura, agora) : null;
  const mes = assinatura?.validaAte && situacao === "ATIVA" ? mesDoPlano(assinatura.validaAte, agora) : null;
  const usados = assinatura && mes ? await usosNoMes(prisma, assinatura.id, mes) : null;

  return (
    <section className="card" aria-labelledby="titulo-plano-corte">
      <div className="card-cabecalho">
        <h2 id="titulo-plano-corte" className="card-titulo">
          Plano de corte
        </h2>
        {situacao && (
          <Badge tom={situacao === "ATIVA" ? "sucesso" : situacao === "VENCIDA" ? "perigo" : "atencao"}>
            {ROTULO_SITUACAO_ASSINATURA[situacao]}
          </Badge>
        )}
      </div>
      {assinatura ? (
        <>
          <dl className="fatos">
            <div>
              <dt>Plano</dt>
              <dd>{assinatura.plano.nome}</dd>
            </div>
            <div>
              <dt>Vale até</dt>
              <dd className="num">
                {assinatura.validaAte
                  ? formatarDataInstante(assinatura.validaAte, { day: "2-digit", month: "2-digit", year: "numeric" }, fuso)
                  : "Primeiro mês não pago"}
              </dd>
            </div>
            {usados !== null && (
              <div>
                <dt>Uso no mês</dt>
                <dd className="num">
                  {assinatura.plano.usosPorMes === null ? usados : `${usados} de ${assinatura.plano.usosPorMes}`}
                </dd>
              </div>
            )}
          </dl>
          <div className="form-acoes">
            <Link href="/painel/planos" className="btn btn-secondary btn-sm">
              Gerenciar nos planos
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="texto-secundario texto-pequeno">Sem plano. Se ele pagou um plano no balcão, registre aqui.</p>
          <div className="form-acoes">
            <Link href={`/painel/planos/assinantes/novo?cliente=${clienteId}`} className="btn btn-secondary btn-sm">
              Adicionar a um plano
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
