import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { COOKIE_NAME, verificarTokenSessao, type SessaoPayload } from "./auth";

// Lê e valida o cookie de sessão no servidor (Server Components, Server
// Actions e Route Handlers). Retorna null se não houver sessão válida.
//
// O token vale 7 dias, então ele sozinho não basta: confere no banco se o
// usuário (e a barbearia) continuam ativos. Assim desativar um barbeiro ou
// suspender uma barbearia corta o acesso na hora, não só no próximo login.
// Nome e papel vêm do banco, então uma edição de perfil aparece na hora.
// Trocar ou redefinir a senha encerra as sessões abertas antes disso.
export const obterSessao = cache(async (): Promise<SessaoPayload | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const sessao = await verificarTokenSessao(token);
  if (!sessao) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.sub },
    select: {
      nome: true,
      role: true,
      ativo: true,
      barbeariaId: true,
      senhaAlteradaEm: true,
      barbearia: { select: { ativo: true } },
    },
  });
  if (!usuario || !usuario.ativo) return null;
  if (usuario.barbeariaId !== sessao.barbeariaId) return null;
  if (usuario.barbearia && !usuario.barbearia.ativo) return null;
  // Senha trocada/redefinida depois que este token foi emitido: sessão antiga
  // (outro aparelho, ou de quem descobriu a senha) deixa de valer. iat é em
  // segundos; compara no mesmo grão pra não derrubar o token reemitido junto.
  const emitidoEm = (sessao as SessaoPayload & { iat?: number }).iat ?? 0;
  if (usuario.senhaAlteradaEm && emitidoEm < Math.floor(usuario.senhaAlteradaEm.getTime() / 1000)) return null;

  return { sub: sessao.sub, nome: usuario.nome, role: usuario.role, barbeariaId: usuario.barbeariaId };
});

export async function exigirSuperAdmin(): Promise<SessaoPayload> {
  const sessao = await obterSessao();
  if (!sessao || sessao.role !== "SUPER_ADMIN") {
    throw new Error("Acesso restrito ao super admin.");
  }
  return sessao;
}

export async function exigirUsuarioDaBarbearia(): Promise<SessaoPayload> {
  const sessao = await obterSessao();
  if (
    !sessao ||
    (sessao.role !== "DONO" && sessao.role !== "BARBEIRO") ||
    !sessao.barbeariaId
  ) {
    throw new Error("Acesso restrito à equipe da barbearia.");
  }
  return sessao;
}
