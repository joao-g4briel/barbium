"use client";

// Última linha de defesa: substitui o layout raiz inteiro, então não pode
// depender do CSS global — o estilo mínimo vai inline.
export default function ErroGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#0d1110",
          color: "#f4f7f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Algo deu errado</h1>
          <p style={{ margin: 0, color: "#a3afa7" }}>O Barbium não conseguiu carregar. Tente de novo em instantes.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              justifySelf: "center",
              minHeight: 44,
              padding: "0 20px",
              border: "none",
              borderRadius: 10,
              background: "#4ade80",
              color: "#0b1a10",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
