-- Planos de corte, fase 2: assinatura no cartão (Mercado Pago cobra todo mês)
-- e o aviso de renovação no WhatsApp.

-- AlterTable
ALTER TABLE "assinaturas_plano" ADD COLUMN     "avisoRenovacaoEm" TIMESTAMP(3),
ADD COLUMN     "cartaoStatus" TEXT,
ADD COLUMN     "mpPreapprovalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_plano_mpPreapprovalId_key" ON "assinaturas_plano"("mpPreapprovalId");

