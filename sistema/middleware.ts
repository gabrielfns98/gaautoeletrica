import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, tokenValido } from "@/lib/auth";

/**
 * Precisam abrir sem senha. O manifesto e o service worker são buscados pelo
 * navegador sem enviar cookie; se caírem na tela de login, o Chrome não
 * reconhece o app e só oferece criar um atalho.
 *
 * A lista é conferida aqui dentro de propósito: o `matcher` abaixo depende de
 * o Next conseguir ler o `config` por análise estática do arquivo, o que não
 * acontece quando o código vai minificado para produção.
 */
const PUBLICOS = new Set([
  "/sw.js",
  "/manifest.webmanifest",
  "/offline",
  "/api/icone",
  "/logo.png",
  "/favicon.ico",
]);

export async function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  if (PUBLICOS.has(caminho) || caminho.startsWith("/fonts/")) {
    return NextResponse.next();
  }

  const logado = await tokenValido(request.cookies.get(COOKIE_SESSAO)?.value);
  const isLogin = caminho.startsWith("/login");

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
