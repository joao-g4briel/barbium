-- Avisos de fim do teste grátis já enviados (um de cada, por barbearia).
ALTER TABLE "barbearias" ADD COLUMN "avisoTesteAcabandoEm" TIMESTAMP(3);
ALTER TABLE "barbearias" ADD COLUMN "avisoTesteFimEm" TIMESTAMP(3);
