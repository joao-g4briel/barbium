import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verificarTokenSessao } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const sessao = token ? await verificarTokenSessao(token) : null;

  const precisaSuperAdmin = pathname.startsWith("/super-admin");
  const precisaPainel = pathname.startsWith("/painel");

  const semAcesso =
    (precisaSuperAdmin && sessao?.role !== "SUPER_ADMIN") ||
    (precisaPainel &&
      sessao?.role !== "DONO" &&
      sessao?.role !== "BARBEIRO");

  if (semAcesso) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/super-admin/:path*", "/painel/:path*"],
};
