-- Use SÓ se a estrutura já foi criada com `npx prisma db push` (em vez do
-- financeiro-comissao.sql). Faz os ajustes de dados que o db push não faz.
-- Pode rodar mais de uma vez sem duplicar nada.

BEGIN;

-- 1. Lançamentos ligados a agendamento vieram da conclusão (o db push marcou
--    todos como MANUAL, o padrão da coluna nova).
UPDATE "caixa_lancamentos" SET "origem" = 'ATENDIMENTO'
WHERE "agendamentoId" IS NOT NULL AND "origem" = 'MANUAL';

-- 2. Comissão dos atendimentos já concluídos que ainda não têm: percentual do
--    profissional; sem ele, o do serviço. Base: o valor que entrou no caixa
--    na conclusão; sem lançamento, o preço atual do serviço.
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
  AND a."comissaoValor" IS NULL
  AND COALESCE(u."comissaoPercentual", s."comissaoPercentual") IS NOT NULL;

-- 3. Sinais já pagos de agendamentos ainda não concluídos entram no caixa
--    como "Sinal" (Pix), na data do pagamento.
INSERT INTO "caixa_lancamentos"
  ("id", "tipo", "valor", "descricao", "barbeariaId", "agendamentoId", "origem", "formaPagamento", "criadoEm")
SELECT 'sinal_' || a."id", 'ENTRADA', a."sinalValor", 'Sinal · ' || s."nome", a."barbeariaId", a."id",
       'SINAL', 'PIX', COALESCE(a."sinalPagoEm", a."criadoEm")
FROM "agendamentos" a
JOIN "servicos" s ON s."id" = a."servicoId"
WHERE a."sinalStatus" = 'PAGO' AND a."status" <> 'CONCLUIDO' AND a."sinalValor" IS NOT NULL
ON CONFLICT ("agendamentoId", "origem") DO NOTHING;

COMMIT;
