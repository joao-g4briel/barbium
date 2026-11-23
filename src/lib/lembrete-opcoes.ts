// Antecedências que a barbearia pode escolher pro lembrete do cliente.
// Fica fora de lembretes.ts porque a tela de Configurações também usa.
export const OPCOES_LEMBRETE_HORAS = [1, 2, 3, 6, 12, 24] as const;

export function rotuloLembrete(horas: number): string {
  if (horas === 24) return "1 dia antes";
  return horas === 1 ? "1 hora antes" : `${horas} horas antes`;
}

export function lembreteValido(horas: number): boolean {
  return (OPCOES_LEMBRETE_HORAS as readonly number[]).includes(horas);
}

// O horário já está dentro da janela do lembrete? (Ex.: lembrete 2h antes e
// faltam 90 min.) Nesse caso a confirmação que o cliente acabou de receber
// já faz o papel do lembrete.
export function dentroDaJanelaDeLembrete(inicio: Date, horasAntes: number | null, agora: Date): boolean {
  if (horasAntes === null) return false;
  return inicio.getTime() - agora.getTime() <= horasAntes * 60 * 60 * 1000;
}
