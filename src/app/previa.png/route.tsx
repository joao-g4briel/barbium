import { ImageResponse } from "next/og";
import { DIAS_TESTE } from "@/lib/precos";
import { LogoBarbium, TAMANHO_PREVIA, fontesDaPrevia } from "@/lib/previa-link";

// Imagem de prévia do Barbium (/previa.png): o título da abertura sobre a
// régua do dia, com o horário das 14:00 já marcado. Usada pelo openGraph do
// layout raiz (landing, cadastro, termos…). Endereço fixo de propósito: o
// opengraph-image por arquivo valeria também para os links pessoais do
// cliente, que ficam sem imagem. Gerada uma vez, no build.

export const dynamic = "force-static";

const FUNDO = "#0d1110";
const SUPERFICIE = "#18231c";
const BORDA = "#2c3b32";
const TEXTO = "#f4f7f5";
const TEXTO_2 = "#a3afa7";
const VERDE = "#047857";
const VERDE_CLARO = "#10b981";

const HORAS = ["09", "10", "11", "12", "13", "14", "15", "16", "17"];

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: FUNDO, fontFamily: "Manrope" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <LogoBarbium altura={44} texto={TEXTO} destaque={VERDE_CLARO} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: TEXTO_2 }}>Teste {DIAS_TESTE} dias grátis</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontFamily: "Archivo", fontWeight: 800, fontSize: 104, lineHeight: 0.95, letterSpacing: -2, color: TEXTO }}>
          <div style={{ display: "flex" }}>O cliente marca sozinho.</div>
          <div style={{ display: "flex" }}>Você segue no corte.</div>
        </div>

        {/* A régua do dia */}
        <div style={{ display: "flex", flexDirection: "column", padding: "18px 28px 22px", borderRadius: 24, border: `2px solid ${BORDA}`, background: SUPERFICIE }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Archivo", fontWeight: 800, fontSize: 36, color: TEXTO }}>
            {HORAS.map((h) => (
              <div key={h} style={{ display: "flex", width: 44, justifyContent: "center" }}>
                {h}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", position: "relative", height: 64, marginTop: 14 }}>
            <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: 210, alignItems: "center", paddingLeft: 20, borderRadius: 14, border: `2px solid ${BORDA}`, color: TEXTO_2, fontSize: 24, fontWeight: 700, whiteSpace: "nowrap" }}>
              Carlos · 09:00
            </div>
            {/* Começa na marca das 14 */}
            <div style={{ display: "flex", position: "absolute", left: 595, top: 0, bottom: 0, width: 230, alignItems: "center", paddingLeft: 22, borderRadius: 14, background: VERDE, color: "#ffffff", fontSize: 26, fontWeight: 700, whiteSpace: "nowrap" }}>
              Lucas · 14:00
            </div>
          </div>
        </div>
      </div>
    ),
    { ...TAMANHO_PREVIA, fonts: await fontesDaPrevia() },
  );
}
