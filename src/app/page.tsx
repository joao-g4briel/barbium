import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";

// A landing page de marketing do BARBIUM é o site estático separado
// (HTML/CSS/JS). Este app cobre o produto: super admin, painel da
// barbearia e agendamento público. A raiz é o start_url do PWA — por
// isso decide pra onde mandar cada papel, em vez de sempre ir pro login.
export default async function Home() {
  const sessao = await obterSessao();

  if (sessao?.role === "SUPER_ADMIN") redirect("/super-admin");
  if (sessao?.role === "DONO" || sessao?.role === "BARBEIRO") redirect("/painel");
  redirect("/login");
}
