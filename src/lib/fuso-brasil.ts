// O servidor (Vercel) roda em UTC; o negócio é no horário de Brasília.
// Sem esse ajuste explícito, "09:00" configurado pelo dono vira 09:00 UTC
// (= 06:00 em Brasília) — o bug que corrigimos. O Brasil não tem mais
// horário de verão desde 2019, então um deslocamento fixo de -3h é
// suficiente, sem precisar de biblioteca de fuso horário.
const OFFSET_MINUTOS = 180;

// Pra usar em toLocaleTimeString/toLocaleDateString em qualquer tela que
// renderiza no servidor (Server Component) — sem isso, o navegador do
// servidor (UTC na Vercel) formata a hora errada, mesmo com locale "pt-BR"
// certo. O locale controla o idioma/formato; o fuso é outra opção, à parte.
export const FUSO_BRASIL = "America/Sao_Paulo";

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

// Domingo (meia-noite, como instante UTC) da semana em que esse instante
// cai no horário de Brasília. Semana começa no domingo, igual ao resto do
// app (ver ORDEM_DIAS_SEMANA).
export function inicioDaSemanaBrasil(instante: Date): Date {
  const dia = inicioDoDiaBrasil(instante);
  const indiceDiaSemana = diaDaSemanaBrasil(instante); // 0 = domingo
  return new Date(dia.getTime() - indiceDiaSemana * 24 * 60 * 60 * 1000);
}

export function fimDaSemanaBrasil(instante: Date): Date {
  return new Date(inicioDaSemanaBrasil(instante).getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
}

// Primeiro dia do mês (meia-noite, como instante UTC) em que esse
// instante cai no horário de Brasília.
export function inicioDoMesBrasil(instante: Date): Date {
  const dia = inicioDoDiaBrasil(instante);
  return new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));
}

export function fimDoMesBrasil(instante: Date): Date {
  const inicio = inicioDoMesBrasil(instante);
  return new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1) - 1);
}

// Fim do dia de calendário que `diaBase` já representa — diaBase deve ser
// uma meia-noite UTC já normalizada (o retorno de inicioDoDiaBrasil, ou de
// um parse direto de "YYYY-MM-DD"), NÃO um instante bruto. Diferente de
// fimDoDiaBrasil, que espera um instante e converte de fuso primeiro: usar
// fimDoDiaBrasil aqui subtrairia 3h de novo e voltaria pro dia errado.
export function fimDesseDiaCalendario(diaBase: Date): Date {
  return new Date(diaBase.getTime() + 24 * 60 * 60 * 1000 - 1);
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
