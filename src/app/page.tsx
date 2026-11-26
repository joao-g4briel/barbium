import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { Landing } from "@/components/landing/landing";
import { DIAS_TESTE } from "@/lib/precos";

const DESCRICAO = `O cliente marca sozinho pelo link, a agenda acompanha cada atendimento, e cada um concluído já cai no caixa com a comissão calculada. Teste ${DIAS_TESTE} dias grátis.`;

export const metadata: Metadata = {
  title: { absolute: "Barbium · Agenda, link de agendamento e caixa para barbearias" },
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: {
    title: "O cliente marca sozinho. Você segue no corte.",
    description: DESCRICAO,
    url: "/",
    siteName: "Barbium",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/previa.png", width: 1200, height: 630, alt: "Barbium: o cliente marca sozinho, você segue no corte." }],
  },
};

// A raiz é a landing para quem não está logado, e também o start_url do PWA:
// quem já entrou vai direto pro seu painel.
export default async function Home() {
  const sessao = await obterSessao();

  if (sessao?.role === "SUPER_ADMIN") redirect("/super-admin");
  if (sessao?.role === "DONO" || sessao?.role === "BARBEIRO") redirect("/painel");
  return <Landing />;
}
