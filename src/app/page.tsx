import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "Barbium · Agenda, WhatsApp e caixa para barbearias" },
  description:
    "O cliente marca pelo link, recebe confirmação e lembrete no WhatsApp, e cada atendimento concluído já cai no caixa com a comissão calculada. Teste 7 dias grátis.",
};

// A raiz é a landing para quem não está logado, e também o start_url do PWA:
// quem já entrou vai direto pro seu painel.
export default async function Home() {
  const sessao = await obterSessao();

  if (sessao?.role === "SUPER_ADMIN") redirect("/super-admin");
  if (sessao?.role === "DONO" || sessao?.role === "BARBEIRO") redirect("/painel");
  return <Landing />;
}
