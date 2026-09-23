// O servidor (Vercel) roda em UTC; o negócio é no horário de Brasília.
// Sem esse ajuste explícito, "09:00" configurado pelo dono vira 09:00 UTC
// (= 06:00 em Brasília) — o bug que corrigimos. O Brasil não tem mais
// horário de verão desde 2019, então um deslocamento fixo de -3h é
// suficiente, sem precisar de biblioteca de fuso horário.
const OFFSET_MINUTOS = 180;

// Meia-noite (como instante UTC) do dia de calendário em que esse
// instante cai no horário de Brasília. Uso típico: "que dia é hoje" ou
// "em que dia da semana isso cai", sem depender do fuso do servidor.
export function inicioDoDiaBrasil(instante: Date): Date {
  const comOffset = new Date(instante.getTime() - OFFSET_MINUTOS * 60 * 1000);
  return new Date(
    Date.UTC(comOffset.getUTCFullYear(), comOffset.getUTCMonth(), comOffset.getUTCDate()),
  );
}

// Fim do dia (23:59:59.999) no horário de Brasília, como instante UTC.
export function fimDoDiaBrasil(instante: Date): Date {
  return new Date(inicioDoDiaBrasil(instante).getTime() + 24 * 60 * 60 * 1000 - 1);
}

// 0 = domingo ... 6 = sábado, calculado no horário de Brasília.
export function diaDaSemanaBrasil(instante: Date): number {
  const comOffset = new Date(instante.getTime() - OFFSET_MINUTOS * 60 * 1000);
  return comOffset.getUTCDay();
}

// Constrói o instante UTC correspondente a "minutosDoDia" no horário de
// Brasília, dentro do dia de calendário de `diaBase` (uma meia-noite UTC
// já normalizada — o retorno de inicioDoDiaBrasil, por exemplo).
export function horarioBrasil(diaBase: Date, minutosDoDia: number): Date {
  return new Date(
    Date.UTC(
      diaBase.getUTCFullYear(),
      diaBase.getUTCMonth(),
      diaBase.getUTCDate(),
      0,
      minutosDoDia + OFFSET_MINUTOS,
    ),
  );
}
