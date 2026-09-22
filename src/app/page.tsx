import { redirect } from "next/navigation";

// A landing page de marketing do BARBIUM é o site estático separado
// (HTML/CSS/JS). Este app cobre o produto: super admin, painel da
// barbearia e agendamento público. A raiz só encaminha pro login.
export default function Home() {
  redirect("/login");
}
