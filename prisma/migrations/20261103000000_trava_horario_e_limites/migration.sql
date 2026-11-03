-- CreateTable
CREATE TABLE "limites_tentativas" (
    "chave" TEXT NOT NULL,
    "contagem" INTEGER NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limites_tentativas_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "limites_tentativas_expiraEm_idx" ON "limites_tentativas"("expiraEm");


-- Trava no próprio banco contra dois agendamentos ativos do mesmo profissional
-- no mesmo horário. A conferência no código continua (dá a mensagem certa pra
-- tela), mas sozinha ela não segura dois pedidos chegando juntos: os dois leem
-- o horário livre antes de qualquer um gravar. Só vale pra quem ainda vai
-- acontecer (confirmado ou esperando o Pix); concluído, falta e cancelado são
-- histórico e não travam nada.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_sem_sobreposicao"
  EXCLUDE USING gist ("barbeiroId" WITH =, tsrange("inicio", "fim") WITH &&)
  WHERE ("status" IN ('CONFIRMADO', 'AGUARDANDO_PAGAMENTO'));
