-- Adicional de WhatsApp (pago à parte). No teste grátis as mensagens saem
-- mesmo sem ele; depois do teste, só com o adicional.
ALTER TABLE "barbearias" ADD COLUMN "whatsappAtivo" BOOLEAN NOT NULL DEFAULT false;

-- Barbearias que já existiam fora do teste continuam recebendo como hoje.
UPDATE "barbearias" SET "whatsappAtivo" = true WHERE "emTeste" = false;
