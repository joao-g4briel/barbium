import type { ReactNode } from "react";
import type { StatusAgendamento } from "@prisma/client";
import { CalendarCheck, CheckCircle2, CircleSlash, UserX } from "lucide-react";
import { ROTULO_STATUS, TOM_STATUS, type TomBadge } from "@/lib/status-agendamento";

export function Badge({ tom = "neutro", icone, children }: { tom?: TomBadge; icone?: ReactNode; children: ReactNode }) {
  return (
    <span className="badge" data-tom={tom}>
      {icone}
      {children}
    </span>
  );
}

export const ICONE_STATUS: Record<StatusAgendamento, typeof CheckCircle2> = {
  CONFIRMADO: CalendarCheck,
  CONCLUIDO: CheckCircle2,
  CANCELADO: CircleSlash,
  FALTA: UserX,
};

// Status nunca depende só da cor: sempre ícone + palavra.
export function StatusBadge({ status }: { status: StatusAgendamento }) {
  const Icone = ICONE_STATUS[status];
  return (
    <Badge tom={TOM_STATUS[status]} icone={<Icone size={13} strokeWidth={2.2} aria-hidden="true" />}>
      {ROTULO_STATUS[status]}
    </Badge>
  );
}
