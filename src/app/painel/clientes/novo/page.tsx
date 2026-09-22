import { FormularioNovoCliente } from "./formulario-novo-cliente";

export default function NovoCliente() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Novo cliente</h1>
      <FormularioNovoCliente />
    </div>
  );
}
