import Link from "next/link";
import { Plus } from "lucide-react";

// Abre o agendamento pelo painel, já no dia (e profissional) que estava na tela.
export function BotaoNovoAgendamento({ data, profissional }: { data?: string; profissional?: string | null }) {
  const busca = new URLSearchParams();
  if (data) busca.set("data", data);
  if (profissional) busca.set("profissional", profissional);
  const query = busca.toString();
  return (
    <Link href={`/painel/agenda/novo${query ? `?${query}` : ""}`} className="btn btn-primary">
      <Plus size={18} aria-hidden="true" />
      Novo agendamento
    </Link>
  );
}
