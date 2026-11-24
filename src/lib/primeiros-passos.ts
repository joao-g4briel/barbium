import type { DiaSemana, Plano } from "@prisma/client";

// Checklist de primeiros passos da barbearia nova, no topo da visão geral do
// dono. Cada passo é concluído pelos próprios dados (nada é guardado à parte):
// serviço cadastrado, horários ajustados, equipe, lembrete e o primeiro
// agendamento. Some quando tudo estiver feito ou quando o dono ocultar.

export type IdPasso = "servicos" | "horarios" | "equipe" | "lembrete" | "link";

export interface Passo {
  id: IdPasso;
  titulo: string;
  descricao: string;
  feito: boolean;
  href?: string;
  acao?: string;
}

export const COOKIE_PASSOS_OCULTOS = "barbium_passos_ocultos";

interface DiaExpediente {
  diaSemana: DiaSemana;
  atende: boolean;
  horaInicio: string;
  horaFim: string;
  almocoInicio: string | null;
  almocoFim: string | null;
}

// O cadastro cria segunda a sábado das 09:00 às 19:00, sem almoço, e domingo
// fechado. Qualquer diferença mostra que o dono já mexeu nos horários.
export function expedientePersonalizado(dias: DiaExpediente[]): boolean {
  if (dias.length === 0) return false;
  return dias.some((d) => {
    if (d.diaSemana === "DOMINGO") return d.atende;
    return !d.atende || d.horaInicio !== "09:00" || d.horaFim !== "19:00" || Boolean(d.almocoInicio || d.almocoFim);
  });
}

export function montarPassos(dados: {
  servicosAtivos: number;
  expediente: DiaExpediente[];
  profissionaisAtivos: number;
  plano: Plano;
  lembreteAtivo: boolean;
  whatsappLigado: boolean;
  agendamentos: number;
}): Passo[] {
  const recebeuAgendamento = dados.agendamentos > 0;
  const passos: Passo[] = [
    {
      id: "servicos",
      titulo: "Cadastre seus serviços",
      descricao: "Nome, duração e preço de cada serviço. É o que o cliente escolhe no link.",
      feito: dados.servicosAtivos > 0,
      href: "/painel/servicos/novo",
      acao: "Cadastrar serviço",
    },
    {
      id: "horarios",
      titulo: "Confira seus horários",
      descricao: "Começamos com segunda a sábado, das 9h às 19h. Ajuste os dias, o almoço e as folgas.",
      feito: expedientePersonalizado(dados.expediente) || recebeuAgendamento,
      href: "/painel/disponibilidade",
      acao: "Ajustar horários",
    },
  ];
  if (dados.plano !== "SOLO") {
    passos.push({
      id: "equipe",
      titulo: "Cadastre sua equipe",
      descricao: "Cada profissional entra com o próprio acesso e tem a própria agenda.",
      feito: dados.profissionaisAtivos > 1,
      href: "/painel/equipe/novo",
      acao: "Cadastrar profissional",
    });
  }
  if (dados.whatsappLigado) {
    passos.push({
      id: "lembrete",
      titulo: "Ligue o lembrete no WhatsApp",
      descricao: "O cliente recebe uma mensagem antes do horário. Você escolhe a antecedência.",
      feito: dados.lembreteAtivo,
      href: "/painel/configuracoes",
      acao: "Escolher lembrete",
    });
  }
  passos.push({
    id: "link",
    titulo: "Mande o link para os clientes",
    descricao: "Coloque na bio do Instagram e no WhatsApp. O passo conclui quando chegar o primeiro agendamento.",
    feito: recebeuAgendamento,
  });
  return passos;
}
