-- Tudo que entrou no banco depois da migration inicial, por db push ou pelos
-- scripts de prisma/sql/. Bancos que já têm isso marcam esta migration como
-- aplicada (prisma migrate resolve --applied), sem rodar o SQL.

-- CreateEnum
CREATE TYPE "SinalStatus" AS ENUM ('PENDENTE', 'PAGO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'DEBITO', 'CREDITO');

-- CreateEnum
CREATE TYPE "OrigemLancamento" AS ENUM ('MANUAL', 'ATENDIMENTO', 'SINAL');

-- CreateEnum
CREATE TYPE "PeriodicidadeAssinatura" AS ENUM ('MENSAL', 'TRIMESTRAL');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO');

-- AlterEnum
ALTER TYPE "StatusAgendamento" ADD VALUE 'AGUARDANDO_PAGAMENTO';

-- DropIndex
DROP INDEX "caixa_lancamentos_agendamentoId_key";

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "comissaoPercentual" DECIMAL(5,2),
ADD COLUMN     "comissaoValor" DECIMAL(10,2),
ADD COLUMN     "sinalDevolvidoEm" TIMESTAMP(3),
ADD COLUMN     "sinalExpiraEm" TIMESTAMP(3),
ADD COLUMN     "sinalPagamentoId" TEXT,
ADD COLUMN     "sinalPagoEm" TIMESTAMP(3),
ADD COLUMN     "sinalStatus" "SinalStatus",
ADD COLUMN     "sinalValor" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "caixa_lancamentos" ADD COLUMN     "formaPagamento" "FormaPagamento",
ADD COLUMN     "origem" "OrigemLancamento" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "assinaturaTipo" "PeriodicidadeAssinatura",
ADD COLUMN     "assinaturaValor" DECIMAL(10,2),
ADD COLUMN     "assinaturaVencimento" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "senhaAlteradaEm" TIMESTAMP(3);

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

-- CreateTable
CREATE TABLE "tokens_redefinicao_senha" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_redefinicao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expediente_dias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "atende" BOOLEAN NOT NULL DEFAULT true,
    "horaInicio" TEXT NOT NULL DEFAULT '09:00',
    "horaFim" TEXT NOT NULL DEFAULT '19:00',
    "almocoInicio" TEXT,
    "almocoFim" TEXT,

    CONSTRAINT "expediente_dias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueios_agenda" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueios_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_pagamento_barbeariaId_key" ON "configuracoes_pagamento"("barbeariaId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_redefinicao_senha_tokenHash_key" ON "tokens_redefinicao_senha"("tokenHash");

-- CreateIndex
CREATE INDEX "tokens_redefinicao_senha_usuarioId_criadoEm_idx" ON "tokens_redefinicao_senha"("usuarioId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "expediente_dias_usuarioId_diaSemana_key" ON "expediente_dias"("usuarioId", "diaSemana");

-- CreateIndex
CREATE INDEX "bloqueios_agenda_usuarioId_inicio_idx" ON "bloqueios_agenda"("usuarioId", "inicio");

-- CreateIndex
CREATE INDEX "agendamentos_status_sinalExpiraEm_idx" ON "agendamentos"("status", "sinalExpiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "caixa_lancamentos_agendamentoId_origem_key" ON "caixa_lancamentos"("agendamentoId", "origem");

-- AddForeignKey
ALTER TABLE "configuracoes_pagamento" ADD CONSTRAINT "configuracoes_pagamento_barbeariaId_fkey" FOREIGN KEY ("barbeariaId") REFERENCES "barbearias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_redefinicao_senha" ADD CONSTRAINT "tokens_redefinicao_senha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expediente_dias" ADD CONSTRAINT "expediente_dias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios_agenda" ADD CONSTRAINT "bloqueios_agenda_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

