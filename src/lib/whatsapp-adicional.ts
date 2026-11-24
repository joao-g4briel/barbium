import { acessoVencido } from "./acesso";

// Mensagens automáticas no WhatsApp (confirmação, lembrete, avisos). Saem
// durante o teste grátis e, depois dele, só com o adicional pago
// (whatsappAtivo, ligado pelo super admin). Com o acesso vencido, nada sai.
// Usado no servidor e nas telas, por isso sem "server-only".

export type EstadoWhatsapp = "adicional" | "teste" | "desligado";

type BarbeariaWhatsapp = { whatsappAtivo: boolean; emTeste: boolean; acessoAte: Date | null };

export function estadoWhatsapp(barbearia: BarbeariaWhatsapp, agora = new Date()): EstadoWhatsapp {
  if (acessoVencido(barbearia, agora)) return "desligado";
  if (barbearia.whatsappAtivo) return "adicional";
  if (barbearia.emTeste) return "teste";
  return "desligado";
}

export function whatsappLigado(barbearia: BarbeariaWhatsapp, agora = new Date()): boolean {
  return estadoWhatsapp(barbearia, agora) !== "desligado";
}
