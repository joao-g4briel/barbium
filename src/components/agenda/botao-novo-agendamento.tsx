import { Plus } from "lucide-react";

// Não existe criação de agendamento pelo painel: o fluxo real é o link
// público da barbearia, que aplica as mesmas regras de expediente, bloqueio
// e conflito. O botão leva pra lá.
export function BotaoNovoAgendamento({ slug }: { slug: string | undefined }) {
  if (!slug) return null;
  return (
    <a href={`/agendar/${slug}`} className="btn btn-primary">
      <Plus size={18} aria-hidden="true" />
      Novo agendamento
    </a>
  );
}
