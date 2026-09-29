import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, SearchX, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/sessao";
import { statusAssinatura } from "@/lib/assinatura";
import { apenasDigitos, formatarTelefone } from "@/lib/formatar";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { CampoBusca } from "@/components/ui/busca";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;

  const { q } = await searchParams;
  const termo = q?.trim() ?? "";
  const digitos = apenasDigitos(termo);

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        barbeariaId: sessao.barbeariaId,
        ...(termo
          ? {
              OR: [
                { nome: { contains: termo, mode: "insensitive" as const } },
                ...(digitos.length >= 3 ? [{ telefone: { contains: digitos } }] : []),
              ],
            }
          : {}),
      },
      orderBy: { nome: "asc" },
      include: { _count: { select: { agendamentos: true } } },
    }),
    prisma.cliente.count({ where: { barbeariaId: sessao.barbeariaId } }),
  ]);

  const souDono = sessao.role === "DONO";

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao={`${total} ${total === 1 ? "cliente cadastrado" : "clientes cadastrados"}`}
        acoes={
          souDono && (
            <Link href="/painel/clientes/novo" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" />
              Novo cliente
            </Link>
          )
        }
      />

      {total === 0 ? (
        <div className="card">
          <EstadoVazio
            icone={<Users size={22} />}
            titulo="Nenhum cliente ainda"
            descricao="Clientes aparecem aqui sozinhos quando alguém agenda pelo link da barbearia. Você também pode cadastrar manualmente."
            acao={
              souDono && (
                <Link href="/painel/clientes/novo" className="btn btn-primary">
                  <Plus size={18} aria-hidden="true" />
                  Cadastrar cliente
                </Link>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="barra-ferramentas">
            <CampoBusca valorInicial={termo} placeholder="Buscar por nome ou telefone" rotulo="Buscar clientes" />
            {termo && (
              <p className="resumo-linha" role="status">
                {clientes.length} {clientes.length === 1 ? "resultado" : "resultados"} para “{termo}”
              </p>
            )}
          </div>

          <section className="card card-sem-padding" aria-label="Lista de clientes">
            {clientes.length === 0 ? (
              <EstadoVazio
                icone={<SearchX size={22} />}
                titulo="Nenhum cliente encontrado"
                descricao="Confira a grafia do nome ou busque pelo telefone com DDD."
                acao={
                  <Link href="/painel/clientes" className="btn btn-secondary">
                    Limpar busca
                  </Link>
                }
              />
            ) : (
              <div className="lista">
                {clientes.map((cliente) => {
                  const status = statusAssinatura(cliente.assinaturaVencimento);
                  const atendimentos = cliente._count.agendamentos;
                  return (
                    <Link key={cliente.id} href={`/painel/clientes/${cliente.id}`} className="lista-item">
                      <Avatar nome={cliente.nome} />
                      <div className="lista-item-principal">
                        <p className="lista-item-titulo">{cliente.nome}</p>
                        <p className="lista-item-sub num">
                          {formatarTelefone(cliente.telefone)} · {atendimentos}{" "}
                          {atendimentos === 1 ? "agendamento" : "agendamentos"}
                        </p>
                      </div>
                      <div className="lista-item-lateral">
                        {status === "ATIVA" && <Badge tom="sucesso">Assinante</Badge>}
                        {status === "VENCIDA" && <Badge tom="atencao">Assinatura vencida</Badge>}
                        <ChevronRight size={18} className="lista-item-chevron" aria-hidden="true" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
