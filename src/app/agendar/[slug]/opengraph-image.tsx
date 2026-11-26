import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { COR_PADRAO, corValida, paletaDaMarca } from "@/lib/cor-marca";
import { FUNDO_PADRAO, paletaNeutra } from "@/lib/tema";
import { iniciais } from "@/lib/formatar";
import { LogoBarbium, TAMANHO_PREVIA, fontesDaPrevia } from "@/lib/previa-link";

// Prévia do link de agendamento de cada barbearia: é o link que o barbeiro
// manda para os clientes no WhatsApp. Mostra a barbearia (logo ou iniciais,
// nome e endereço) nas cores que o dono escolheu, e não uma propaganda do
// Barbium. O logo entra quando é PNG ou JPEG (o gerador não lê WebP); senão,
// as iniciais no círculo da cor da marca.

export const alt = "Agende seu horário pelo link";
export const size = TAMANHO_PREVIA;
export const contentType = "image/png";

const VERDE_BARBIUM = "#10b981";

function tamanhoDoNome(nome: string): number {
  if (nome.length <= 14) return 120;
  if (nome.length <= 22) return 100;
  if (nome.length <= 32) return 84;
  return 68;
}

export default async function Imagem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const barbearia = await prisma.barbearia.findUnique({
    where: { slug },
    select: { nome: true, endereco: true, corMarca: true, corFundo: true, ativo: true, logo: { select: { dados: true, tipo: true } } },
  });

  const n = paletaNeutra(corValida(barbearia?.corFundo) ? barbearia.corFundo : FUNDO_PADRAO);
  const marca = paletaDaMarca(corValida(barbearia?.corMarca) ? barbearia.corMarca : COR_PADRAO, { fundo: n.fundo, superficie: n.superficie })!;
  const fontes = await fontesDaPrevia();

  if (!barbearia || !barbearia.ativo) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: n.fundo }}>
          <LogoBarbium altura={72} texto={n.texto} destaque={VERDE_BARBIUM} />
        </div>
      ),
      { ...size, fonts: fontes },
    );
  }

  const logo =
    barbearia.logo && (barbearia.logo.tipo === "image/png" || barbearia.logo.tipo === "image/jpeg")
      ? `data:${barbearia.logo.tipo};base64,${Buffer.from(barbearia.logo.dados).toString("base64")}`
      : null;
  const endereco = barbearia.endereco ? (barbearia.endereco.length > 70 ? `${barbearia.endereco.slice(0, 69)}…` : barbearia.endereco) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px 64px", background: n.fundo, fontFamily: "Manrope" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={176} height={176} alt="" style={{ borderRadius: 88, objectFit: "cover", border: `3px solid ${n.bordaForte}` }} />
          ) : (
            <div style={{ display: "flex", width: 176, height: 176, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 88, background: marca.primaria, color: marca.sobrePrimaria, fontFamily: "Archivo", fontWeight: 800, fontSize: 76 }}>
              {iniciais(barbearia.nome)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
            <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 800, fontSize: tamanhoDoNome(barbearia.nome), lineHeight: 0.95, letterSpacing: -1.5, color: n.texto }}>
              {barbearia.nome}
            </div>
            {endereco && <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: n.textoSecundario }}>{endereco}</div>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 500, color: n.texto }}>Agende seu horário pelo link, sem precisar ligar.</div>
            <div style={{ display: "flex" }}>
              <div style={{ display: "flex", padding: "18px 34px", borderRadius: 16, background: marca.primaria, color: marca.sobrePrimaria, fontSize: 32, fontWeight: 700 }}>
                Escolher horário
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: n.textoApagado, fontSize: 22, fontWeight: 500 }}>
            pelo
            <LogoBarbium altura={30} texto={n.textoSecundario} destaque={VERDE_BARBIUM} />
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fontes },
  );
}
