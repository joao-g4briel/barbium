-- Lembrete automático no WhatsApp antes do horário (fase 2, item 7).
ALTER TABLE "barbearias" ADD COLUMN "lembreteHorasAntes" INTEGER;

ALTER TABLE "agendamentos" ADD COLUMN "lembreteEnviadoEm" TIMESTAMP(3);
