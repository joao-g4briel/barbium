-- Status "chegou" e "em atendimento", e o histórico do agendamento (fase 2, item 11).
-- A trava de horário passa a valer pros status novos na migration seguinte:
-- valor novo de enum não pode ser usado na mesma transação em que é criado.
-- CreateEnum
CREATE TYPE "AcaoHistorico" AS ENUM ('CRIADO', 'STATUS', 'HORARIO', 'SERVICO');

-- AlterEnum


ALTER TYPE "StatusAgendamento" ADD VALUE 'CHEGOU';
ALTER TYPE "StatusAgendamento" ADD VALUE 'EM_ATENDIMENTO';

-- CreateTable
CREATE TABLE "agendamento_historico" (
    "id" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "acao" "AcaoHistorico" NOT NULL,
    "statusDe" "StatusAgendamento",
    "statusPara" "StatusAgendamento",
    "detalhe" TEXT,
    "usuarioId" TEXT,
    "autor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamento_historico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agendamento_historico_agendamentoId_criadoEm_idx" ON "agendamento_historico"("agendamentoId", "criadoEm");

-- AddForeignKey
ALTER TABLE "agendamento_historico" ADD CONSTRAINT "agendamento_historico_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento_historico" ADD CONSTRAINT "agendamento_historico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

