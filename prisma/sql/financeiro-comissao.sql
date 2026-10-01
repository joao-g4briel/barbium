-- Comissão por profissional, forma de pagamento e sinal separado no caixa.
-- Aplique inteiro (está numa transação: ou entra tudo, ou nada).
-- Aplique ANTES de publicar o código novo.

BEGIN;

-- Estrutura -----------------------------------------------------------------

CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DINHEIRO', 'DEBITO', 'CREDITO');

CREATE TYPE "OrigemLancamento" AS ENUM ('MANUAL', 'ATENDIMENTO', 'SINAL');

-- Um agendamento passa a poder ter dois lançamentos (sinal + atendimento).
DROP INDEX "caixa_lancamentos_agendamentoId_key";

ALTER TABLE "agendamentos" ADD COLUMN     "comissaoPercentual" DECIMAL(5,2),
ADD COLUMN     "comissaoValor" DECIMAL(10,2),
ADD COLUMN     "sinalDevolvidoEm" TIMESTAMP(3);

ALTER TABLE "caixa_lancamentos" ADD COLUMN     "formaPagamento" "FormaPagamento",
ADD COLUMN     "origem" "OrigemLancamento" NOT NULL DEFAULT 'MANUAL';

-- Dados que já existem --------------------------------------------------------

-- 1. Todo lançamento ligado a agendamento, até hoje, veio da conclusão.
UPDATE "caixa_lancamentos" SET "origem" = 'ATENDIMENTO' WHERE "agendamentoId" IS NOT NULL;

-- 2. Comissão dos atendimentos já concluídos: percentual do profissional;
--    sem ele, o do serviço. Base: o valor que entrou no caixa na conclusão
--    (o preço da época); sem lançamento, o preço atual do serviço.
UPDATE "agendamentos" a
SET "comissaoPercentual" = COALESCE(u."comissaoPercentual", s."comissaoPercentual"),
    "comissaoValor" = ROUND(
      COALESCE(c."valor", s."preco") * COALESCE(u."comissaoPercentual", s."comissaoPercentual") / 100,
      2
    )
FROM "servicos" s, "usuarios" u, "agendamentos" a2
LEFT JOIN "caixa_lancamentos" c ON c."agendamentoId" = a2."id" AND c."origem" = 'ATENDIMENTO'
WHERE a2."id" = a."id"
  AND s."id" = a."servicoId"
  AND u."id" = a."barbeiroId"
  AND a."status" = 'CONCLUIDO'
  AND COALESCE(u."comissaoPercentual", s."comissaoPercentual") IS NOT NULL;

-- 3. Sinais já pagos de agendamentos ainda não concluídos entram no caixa
--    como "Sinal" (Pix), na data do pagamento. Os já concluídos ficam como
--    estão: o lançamento da conclusão deles já tem o valor cheio.
INSERT INTO "caixa_lancamentos"
  ("id", "tipo", "valor", "descricao", "barbeariaId", "agendamentoId", "origem", "formaPagamento", "criadoEm")
SELECT 'sinal_' || a."id", 'ENTRADA', a."sinalValor", 'Sinal · ' || s."nome", a."barbeariaId", a."id",
       'SINAL', 'PIX', COALESCE(a."sinalPagoEm", a."criadoEm")
FROM "agendamentos" a
JOIN "servicos" s ON s."id" = a."servicoId"
WHERE a."sinalStatus" = 'PAGO' AND a."status" <> 'CONCLUIDO' AND a."sinalValor" IS NOT NULL;

-- Índice (depois dos dados, pra valer já sobre eles) -------------------------

CREATE UNIQUE INDEX "caixa_lancamentos_agendamentoId_origem_key" ON "caixa_lancamentos"("agendamentoId", "origem");

COMMIT;
