import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ROTULO_PAPEL, formatarDataInstante } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { Indicador } from "@/components/ui/indicador";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FormularioEditarBarbearia } from "./formulario-editar-barbearia";

export const metadata: Metadata = { title: "Gerenciar barbearia" };

export default async function DetalheBarbearia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const barbearia = await prisma.barbearia.findUnique({
    where: { id },
    include: {
      usuarios: { orderBy: { criadoEm: "asc" } },
      _count: { select: { clientes: true, agendamentos: true } },
    },
  });

  if (!barbearia) notFound();

  return (
    <>
      <CabecalhoPagina
        voltar={{ href: "/super-admin/barbearias", rotulo: "Barbearias" }}
        titulo={barbearia.nome}
        descricao={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            /agendar/{barbearia.slug}
            {barbearia.ativo ? <Badge tom="sucesso">Ativa</Badge> : <Badge tom="atencao">Suspensa</Badge>}
          </span>
        }
      />

      <div className="pilha">
        <section className="indicadores" style={{ "--indicadores-colunas": 2 } as React.CSSProperties} aria-label="Uso">
          <Indicador rotulo="Clientes cadastrados" valor={barbearia._count.clientes} icone={<Users size={22} />} />
          <Indicador rotulo="Agendamentos no total" valor={barbearia._count.agendamentos} icone={<CalendarCheck size={22} />} />
        </section>

        <div className="grade-painel grade-painel-1-1">
          <FormularioEditarBarbearia
            barbeariaId={barbearia.id}
            nome={barbearia.nome}
            planoAtual={barbearia.plano}
            ativoAtual={barbearia.ativo}
          />

          <section className="card card-sem-padding" aria-labelledby="titulo-equipe">
            <div className="card-cabecalho">
              <div>
                <h2 id="titulo-equipe" className="card-titulo">
                  Equipe
                </h2>
                <p className="card-descricao">Criada em {formatarDataInstante(barbearia.criadoEm)}</p>
              </div>
            </div>
            {barbearia.usuarios.length === 0 ? (
              <EstadoVazio compacto icone={<Users size={22} />} titulo="Nenhum usuário cadastrado" />
            ) : (
              <div className="lista">
                {barbearia.usuarios.map((usuario) => (
                  <div key={usuario.id} className="lista-item">
                    <Avatar nome={usuario.nome} tamanho={36} />
                    <div className="lista-item-principal">
                      <p className="lista-item-titulo">{usuario.nome}</p>
                      <p className="lista-item-sub">{usuario.email}</p>
                    </div>
                    <div className="lista-item-lateral">
                      <Badge tom={usuario.role === "DONO" ? "info" : "neutro"}>{ROTULO_PAPEL[usuario.role]}</Badge>
                      {!usuario.ativo && <Badge tom="atencao">Inativo</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
