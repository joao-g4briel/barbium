-- CreateEnum
CREATE TYPE "SinalStatus" AS ENUM ('PENDENTE', 'PAGO');

-- AlterEnum
ALTER TYPE "StatusAgendamento" ADD VALUE 'AGUARDANDO_PAGAMENTO';

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "sinalExpiraEm" TIMESTAMP(3),
ADD COLUMN     "sinalPagamentoId" TEXT,
ADD COLUMN     "sinalPagoEm" TIMESTAMP(3),
ADD COLUMN     "sinalStatus" "SinalStatus",
ADD COLUMN     "sinalValor" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "configuracoes_pagamento" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "sinalAtivo" BOOLEAN NOT NULL DEFAULT false,
    "sinalPercentual" INTEGER NOT NULL DEFAULT 50,
    "mpAccessTokenCifrado" TEXT,
    "mpContaDescricao" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_pagamento_barbeariaId_key" ON "configuracoes_pagamento"("barbeariaId");

-- CreateIndex
CREATE INDEX "agendamentos_status_sinalExpiraEm_idx" ON "agendamentos"("status", "sinalExpiraEm");

-- AddForeignKey
ALTER TABLE "configuracoes_pagamento" ADD CONSTRAINT "configuracoes_pagamento_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "barbearias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

