-- Cadastro pelo site com teste grátis (landing). Barbearias que já existem
-- ficam sem prazo (acessoAte vazio) e fora do teste.
ALTER TABLE "barbearias" ADD COLUMN "acessoAte" TIMESTAMP(3),
ADD COLUMN "emTeste" BOOLEAN NOT NULL DEFAULT false;
