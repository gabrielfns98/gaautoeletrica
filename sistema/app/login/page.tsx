"use client";

import { useActionState } from "react";
import { entrar, type ResultadoLogin } from "./actions";
import { OFICINA } from "@/lib/oficina";

export default function LoginPage() {
  const [estado, enviar, enviando] = useActionState<ResultadoLogin | null, FormData>(
    entrar,
    null,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        action={enviar}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-lg"
      >
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-xl text-xl font-black text-white"
          style={{ backgroundColor: OFICINA.corPrimaria }}
        >
          {OFICINA.nome.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900">
          {OFICINA.nome}
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Fila de trabalho, OS e orçamentos
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700" htmlFor="senha">
            Senha da oficina
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        {estado?.erro && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-4 w-full rounded-lg px-4 py-3 text-base font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
          style={{ backgroundColor: OFICINA.corPrimaria }}
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
