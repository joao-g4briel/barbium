-- Tema da barbearia: cor de fundo (junto com a cor da marca) e a opção de
-- usar as cores também no painel (desligada por padrão).

-- AlterTable
ALTER TABLE "barbearias" ADD COLUMN     "corFundo" TEXT,
ADD COLUMN     "temaNoPainel" BOOLEAN NOT NULL DEFAULT false;

