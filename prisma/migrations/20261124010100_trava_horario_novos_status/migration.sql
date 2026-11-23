-- A trava contra dois agendamentos do mesmo profissional no mesmo horário
-- (ver 20261103000000_trava_horario_e_limites) passa a valer também pra quem
-- já chegou ou está sendo atendido. Sem isso, um cliente "em atendimento"
-- deixaria o horário dele livre pra outro agendamento.
ALTER TABLE "agendamentos" DROP CONSTRAINT "agendamentos_sem_sobreposicao";

ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_sem_sobreposicao"
  EXCLUDE USING gist ("barbeiroId" WITH =, tsrange("inicio", "fim") WITH &&)
  WHERE ("status" IN ('CONFIRMADO', 'CHEGOU', 'EM_ATENDIMENTO', 'AGUARDANDO_PAGAMENTO'));
