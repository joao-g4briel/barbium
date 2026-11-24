import { FUSO_PADRAO, offsetDoFuso } from "./fusos";

// O servidor (Vercel) roda em UTC; o negócio é no horário local da barbearia.
// Sem esse ajuste explícito, "09:00" configurado pelo dono vira 09:00 UTC
// (= 06:00 em Brasília) — o bug que corrigimos. O Brasil não tem mais
// horário de verão desde 2019, então cada fuso é um deslocamento fixo
// (lib/fusos.ts). Todas as funções aceitam o fuso da barbearia (IANA) e,
// sem ele, usam o horário de Brasília.

// Pra usar em toLocaleTimeString/toLocaleDateString em qualquer tela que
// renderiza no servidor (Server Component) — sem isso, o navegador do
// servidor (UTC na Vercel) formata a hora errada, mesmo com locale "pt-BR"
// certo. O locale controla o idioma/formato; o fuso é outra opção, à parte.
export const FUSO_BRASIL = FUSO_PADRAO;

const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

// Meia-noite (como instante UTC) do dia de calendário em que esse
// instante cai no horário local. Uso típico: "que dia é hoje" ou
// "em que dia da semana isso cai", sem depender do fuso do servidor.
export function inicioDoDiaBrasil(instante: Date, fuso: string = FUSO_BRASIL): Date {
  const comOffset = new Date(instante.getTime() - offsetDoFuso(fuso) * MINUTO);
  return new Date(Date.UTC(comOffset.getUTCFullYear(), comOffset.getUTCMonth(), comOffset.getUTCDate()));
}

// Fim do dia (23:59:59.999) no horário local, como instante UTC.
export function fimDoDiaBrasil(instante: Date, fuso: string = FUSO_BRASIL): Date {
  return new Date(inicioDoDiaBrasil(instante, fuso).getTime() + DIA - 1);
}

// Domingo (meia-noite, como instante UTC) da semana em que esse instante
// cai no horário local. Semana começa no domingo, igual ao resto do
// app (ver ORDEM_DIAS_SEMANA).
export function inicioDaSemanaBrasil(instante: Date, fuso: string = FUSO_BRASIL): Date {
  const dia = inicioDoDiaBrasil(instante, fuso);
  const indiceDiaSemana = diaDaSemanaBrasil(instante, fuso); // 0 = domingo
  return new Date(dia.getTime() - indiceDiaSemana * DIA);
}

export function fimDaSemanaBrasil(instante: Date, fuso: string = FUSO_BRASIL): Date {
  return new Date(inicioDaSemanaBrasil(instante, fuso).getTime() + 7 * DIA - 1);
}

// Primeiro dia do mês (meia-noite, como instante UTC) em que esse
// instante cai no horário local.
export function inicioDoMesBrasil(instante: Date, fuso: string = FUSO_BRASIL): Date {
  const dia = inicioDoDiaBrasil(instante, fuso);
  return new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), 1));
}

export function fimDoMesBrasil(instante: Date, fuso: string = FUSO_BRASIL): Date {
  const inicio = inicioDoMesBrasil(instante, fuso);
  return new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1) - 1);
}

// Fim do dia de calendário que `diaBase` já representa — diaBase deve ser
// uma meia-noite UTC já normalizada (o retorno de inicioDoDiaBrasil, ou de
// um parse direto de "YYYY-MM-DD"), NÃO um instante bruto. Diferente de
// fimDoDiaBrasil, que espera um instante e converte de fuso primeiro: usar
// fimDoDiaBrasil aqui subtrairia o deslocamento de novo e voltaria pro dia errado.
export function fimDesseDiaCalendario(diaBase: Date): Date {
  return new Date(diaBase.getTime() + DIA - 1);
}

// 0 = domingo ... 6 = sábado, calculado no horário local.
export function diaDaSemanaBrasil(instante: Date, fuso: string = FUSO_BRASIL): number {
  const comOffset = new Date(instante.getTime() - offsetDoFuso(fuso) * MINUTO);
  return comOffset.getUTCDay();
}

// Constrói o instante UTC correspondente a "minutosDoDia" no horário local,
// dentro do dia de calendário de `diaBase` (uma meia-noite UTC já
// normalizada — o retorno de inicioDoDiaBrasil, por exemplo).
export function horarioBrasil(diaBase: Date, minutosDoDia: number, fuso: string = FUSO_BRASIL): Date {
  return new Date(
    Date.UTC(diaBase.getUTCFullYear(), diaBase.getUTCMonth(), diaBase.getUTCDate(), 0, minutosDoDia + offsetDoFuso(fuso)),
  );
}
