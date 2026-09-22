import { FormularioNovaBarbearia } from "./formulario-nova-barbearia";

export default function NovaBarbearia() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Nova barbearia</h1>
      <FormularioNovaBarbearia />
    </div>
  );
}
