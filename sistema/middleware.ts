import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, tokenValido } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const logado = await tokenValido(request.cookies.get(COOKIE_SESSAO)?.value);
  const isLogin = request.nextUrl.pathname.startsWith("/login");

  if (!logado && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (logado && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|fonts/|manifest.webmanifest|sw.js|offline|api/icone).*)",
  ],
};
