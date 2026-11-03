// O banco recusa dois agendamentos ativos do mesmo profissional no mesmo
// horário (constraint agendamentos_sem_sobreposicao, criada na migration
// 20261103000000_trava_horario_e_limites). É a última linha de defesa quando
// dois pedidos passam juntos pela conferência do código. O Prisma não traduz
// esse erro (chega como PrismaClientUnknownRequestError), então ele é
// reconhecido pelo nome da constraint na mensagem.
export function ehConflitoDeHorario(erro: unknown): boolean {
  return erro instanceof Error && erro.message.includes("agendamentos_sem_sobreposicao");
}
