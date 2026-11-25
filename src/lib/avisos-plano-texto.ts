// Texto do aviso de renovação do plano (sem banco, pra testar).

export function montarAvisoRenovacao(d: {
  cliente: string;
  plano: string;
  barbearia: string;
  vence: string;
  link: string | null;
  // Renovava no cartão e o cliente cancelou a renovação.
  cartaoCancelado: boolean;
}): string {
  const primeiroNome = d.cliente.trim().split(/\s+/)[0] || d.cliente;
  return [
    `Olá, ${primeiroNome}!`,
    "",
    `Seu plano *${d.plano}* na *${d.barbearia}* vence ${d.vence.toLowerCase()}.`,
    d.cartaoCancelado
      ? "A renovação automática no cartão foi cancelada, então ele não renova sozinho."
      : "Para continuar agendando pelo plano, renove antes do vencimento.",
    ...(d.link ? ["", `Renove aqui: ${d.link}`] : []),
  ].join("\n");
}
