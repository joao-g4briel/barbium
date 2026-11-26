-- Mercado Pago conectado pelo botão (OAuth): refresh token cifrado, validade
-- do token e id da conta. Pix pela chave da própria barbearia: tipo, chave e
-- cidade, e o "cliente avisou que pagou" no sinal e no mês do plano.
-- Só acrescenta colunas; nada existente muda.

-- CreateEnum
CREATE TYPE "TipoChavePix" AS ENUM ('CPF', 'CNPJ', 'TELEFONE', 'EMAIL', 'ALEATORIA');

-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "sinalInformadoEm" TIMESTAMP(3),
ADD COLUMN     "sinalViaChave" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "assinatura_pagamentos" ADD COLUMN     "informadoEm" TIMESTAMP(3),
ADD COLUMN     "viaChave" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "configuracoes_pagamento" ADD COLUMN     "mpRefreshTokenCifrado" TEXT,
ADD COLUMN     "mpTokenExpiraEm" TIMESTAMP(3),
ADD COLUMN     "mpUsuarioId" TEXT,
ADD COLUMN     "pixChave" TEXT,
ADD COLUMN     "pixCidade" TEXT,
ADD COLUMN     "pixTipoChave" "TipoChavePix";

