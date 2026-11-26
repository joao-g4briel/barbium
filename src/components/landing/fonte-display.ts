import { Archivo } from "next/font/google";

// Fonte de destaque da landing (títulos e horários grandes), usada condensada
// pelo eixo de largura. Só a landing carrega: o painel segue só em Manrope.
export const fonteDisplay = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
});
