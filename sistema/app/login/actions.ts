"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COOKIE_SESSAO, criarTokenSessao, senhaCorreta } from "@/lib/auth";

export type ResultadoLogin = { erro?: string };

const schema = z.object({ senha: z.string().min(1, "Digite a senha.") });

export async function entrar(
  _anterior: ResultadoLogin | null,
  formData: FormData,
): Promise<ResultadoLogin> {
  const dados = schema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: "Digite a senha." };

  if (!senhaCorreta(dados.data.senha)) return { erro: "Senha incorreta." };

  (await cookies()).set(COOKIE_SESSAO, await criarTokenSessao(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  redirect("/");
}
