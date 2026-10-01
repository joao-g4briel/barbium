import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";
import { obterSessao } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { inicioDoDiaBrasil } from "@/lib/fuso-brasil";
import { obterServicosAtivos } from "@/lib/agenda-vm";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FormularioNovoAgendamento } from "./formulario-novo-agendamento";

export const metadata: Metadata = { title: "Novo agendamento" };

function chaveDia(data: Date): string {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`;
}

export default async function NovoAgendamento({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; profissional?: string; cliente?: string }>;
}) {
  const sessao = await obterSessao();
  if (!sessao?.barbeariaId) return null;
  const params = await searchParams;
  const souDono = sessao.role === "DONO";

  const [servicos, profissionais, cliente] = await Promise.all([
    obterServicosAtivos(sessao.barbeariaId),
    // O barbeiro só agenda na própria agenda.
    prisma.usuario.findMany({
      where: {
        barbeariaId: sessao.barbeariaId,
        ativo: true,
        role: { in: ["DONO", "BARBEIRO"] },
        ...(souDono ? {} : { id: sessao.sub }),
      },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    params.cliente
      ? prisma.cliente.findFirst({
          where: { id: params.cliente, barbeariaId: sessao.barbeariaId },
          select: { id: true, nome: true, telefone: true },
        })
      : Promise.resolve(null),
  ]);

  const hoje = chaveDia(inicioDoDiaBrasil(new Date()));
  const dataInicial = params.data && /^\d{4}-\d{2}-\d{2}$/.test(params.data) && params.data >= hoje ? params.data : hoje;
  const profissionalInicial =
    profissionais.find((p) => p.id === params.profissional)?.id ??
    profissionais.find((p) => p.id === sessao.sub)?.id ??
    profissionais[0]?.id ??
    "";

  return (
    <>
      <CabecalhoPagina
        titulo="Novo agendamento"
        descricao="Para quem marcou por telefone, no balcão ou chegou agora."
        voltar={{ href: "/painel/agenda", rotulo: "Agenda" }}
      />
      {servicos.length === 0 || profissionais.length === 0 ? (
        <div className="card">
          <EstadoVazio
            icone={<CalendarX2 size={22} />}
            titulo="Ainda não dá para agendar"
            descricao={
              servicos.length === 0
                ? "Cadastre pelo menos um serviço ativo antes de agendar."
                : "Não há profissionais ativos nesta barbearia."
            }
          />
        </div>
      ) : (
        <FormularioNovoAgendamento
          servicos={servicos}
          profissionais={profissionais}
          clienteInicial={cliente}
          dataInicial={dataInicial}
          dataMinima={hoje}
          profissionalInicial={profissionalInicial}
        />
      )}
    </>
  );
}
