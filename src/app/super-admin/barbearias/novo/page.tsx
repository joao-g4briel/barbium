import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/cabecalho-pagina";
import { FormularioNovaBarbearia } from "./formulario-nova-barbearia";

export const metadata: Metadata = { title: "Nova barbearia" };

export default function NovaBarbearia() {
  return (
    <>
      <CabecalhoPagina titulo="Nova barbearia" voltar={{ href: "/super-admin/barbearias", rotulo: "Barbearias" }} />
      <FormularioNovaBarbearia />
    </>
  );
}
