import { Search } from "lucide-react";

// Busca por GET: funciona sem JavaScript e mantém o termo na URL.
export function CampoBusca({
  valorInicial,
  placeholder,
  rotulo,
}: {
  valorInicial?: string;
  placeholder: string;
  rotulo: string;
}) {
  return (
    <form method="get" role="search" className="busca">
      <label htmlFor="busca" className="sr-only">
        {rotulo}
      </label>
      <Search size={18} aria-hidden="true" />
      <input
        id="busca"
        name="q"
        type="search"
        className="input"
        defaultValue={valorInicial}
        placeholder={placeholder}
        autoComplete="off"
      />
    </form>
  );
}
