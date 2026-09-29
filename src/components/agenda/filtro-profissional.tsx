"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";

export function FiltroProfissional({
  profissionais,
  valor,
  caminho,
  parametros,
}: {
  profissionais: { id: string; nome: string }[];
  valor: string;
  caminho: string;
  parametros: Record<string, string>;
}) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();

  function mudar(id: string) {
    const busca = new URLSearchParams(parametros);
    if (id) busca.set("profissional", id);
    else busca.delete("profissional");
    const query = busca.toString();
    iniciarTransicao(() => router.push(query ? `${caminho}?${query}` : caminho));
  }

  return (
    <div className="select-compacto">
      <UsersRound size={18} aria-hidden="true" />
      <label htmlFor="filtro-profissional" className="sr-only">
        Filtrar por profissional
      </label>
      <select
        id="filtro-profissional"
        className="input"
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        aria-busy={pendente || undefined}
      >
        <option value="">Todos os profissionais</option>
        {profissionais.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
