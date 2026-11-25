-- Personalização do link de agendamento: recado, preços à mostra, antecedência
-- mínima, dias à frente, e ordem e descrição dos serviços. Os padrões mantêm
-- o comportamento de antes (7 dias, sem mínimo, preços à mostra).

-- AlterTable
ALTER TABLE "barbearias" ADD COLUMN     "antecedenciaMinimaMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "diasAFrente" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "mensagemAgendamento" TEXT,
ADD COLUMN     "mostrarPrecos" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "servicos" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

