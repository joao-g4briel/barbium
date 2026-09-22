import { FormularioLogin } from "./formulario-login";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontWeight: 900, fontSize: "1.5rem", letterSpacing: "0.03em" }}>
            BARB<span style={{ color: "var(--neon)" }}>IUM</span>
          </span>
        </div>
        <FormularioLogin proximaRota={next ?? null} />
      </div>
    </main>
  );
}
