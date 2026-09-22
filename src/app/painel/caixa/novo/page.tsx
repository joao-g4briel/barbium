import { FormularioNovoLancamento } from "./formulario-novo-lancamento";

export default function NovoLancamento() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Novo lançamento</h1>
      <FormularioNovoLancamento />
    </div>
  );
}
