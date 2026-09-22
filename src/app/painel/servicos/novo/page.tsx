import { FormularioNovoServico } from "./formulario-novo-servico";

export default function NovoServico() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Novo serviço</h1>
      <FormularioNovoServico />
    </div>
  );
}
