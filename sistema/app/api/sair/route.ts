import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth";

export async function POST(request: Request) {
  const resposta = NextResponse.redirect(new URL("/login", request.url));
  resposta.cookies.set(COOKIE_SESSAO, "", { path: "/", maxAge: 0 });
  return resposta;
}
