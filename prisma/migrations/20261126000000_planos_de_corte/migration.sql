-- Planos de corte: a barbearia vende planos mensais aos clientes (pagos pelo
-- Pix da página de agendamento ou no balcão) e o assinante agenda sem pagar.

-- CreateEnum
CREATE TYPE "StatusPagamentoAssinatura" AS ENUM ('PENDENTE', 'PAGO', 'EXPIRADO');

-- AlterEnum
ALTER TYPE "OrigemLancamento" ADD VALUE 'ASSINATURA';

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "assinaturaId" TEXT;

-- AlterTable
ALTER TABLE "caixa_lancamentos" ADD COLUMN     "pagamentoAssinaturaId" TEXT;

-- CreateTable
CREATE TABLE "planos_corte" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "usosPorMes" INTEGER,
    "comissaoValor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_corte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_corte_servicos" (
    "planoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,

    CONSTRAINT "planos_corte_servicos_pkey" PRIMARY KEY ("planoId","servicoId")
);

-- CreateTable
CREATE TABLE "assinaturas_plano" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "validaAte" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinaturas_plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinatura_pagamentos" (
    "id" TEXT NOT NULL,
    "barbeariaId" TEXT NOT NULL,
    "assinaturaId" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "mpPagamentoId" TEXT,
    "status" "StatusPagamentoAssinatura" NOT NULL DEFAULT 'PENDENTE',
    "expiraEm" TIMESTAMP(3),
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinatura_pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planos_corte_barbeariaId_idx" ON "planos_corte"("barbeariaId");

-- CreateIndex
CREATE INDEX "assinaturas_plano_barbeariaId_idx" ON "assinaturas_plano"("barbeariaId");

-- CreateIndex
CREATE INDEX "assinaturas_plano_clienteId_idx" ON "assinaturas_plano"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "assinatura_pagamentos_mpPagamentoId_key" ON "assinatura_pagamentos"("mpPagamentoId");

-- CreateIndex
CREATE INDEX "assinatura_pagamentos_assinaturaId_criadoEm_idx" ON "assinatura_pagamentos"("assinaturaId", "criadoEm");

-- CreateIndex
CREATE INDEX "agendamentos_assinaturaId_inicio_idx" ON "agendamentos"("assinaturaId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "caixa_lancamentos_pagamentoAssinaturaId_key" ON "caixa_lancamentos"("pagamentoAssinaturaId");

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "assinaturas_plano"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa_lancamentos" ADD CONSTRAINT "caixa_lancamentos_pagamentoAssinaturaId_fkey" FOREIGN KEY ("pagamentoAssinaturaId") REFERENCES "assinatura_pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_corte" ADD CONSTRAINT "planos_corte_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "barbearias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_corte_servicos" ADD CONSTRAINT "planos_corte_servicos_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_corte_servicos" ADD CONSTRAINT "planos_corte_servicos_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_plano" ADD CONSTRAINT "assinaturas_plano_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "barbearias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_plano" ADD CONSTRAINT "assinaturas_plano_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_plano" ADD CONSTRAINT "assinaturas_plano_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_corte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinatura_pagamentos" ADD CONSTRAINT "assinatura_pagamentos_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "barbearias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinatura_pagamentos" ADD CONSTRAINT "assinatura_pagamentos_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "assinaturas_plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

