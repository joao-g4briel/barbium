import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAME, verificarTokenSessao, type SessaoPayload } from "./auth";

// Lê e valida o cookie de sessão no servidor (Server Components, Server
// Actions e Route Handlers). Retorna null se não houver sessão válida.
export async function obterSessao(): Promise<SessaoPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarTokenSessao(token);
}

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
