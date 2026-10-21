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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form action={enviar} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-lg font-bold" style={{ color: OFICINA.corPrimaria }}>
          {OFICINA.nome}
        </h1>
        <div>
          <label className="block text-sm font-medium" htmlFor="senha">
            Senha da oficina
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-3 text-base"
          />
        </div>
        {estado?.erro && <p className="text-sm font-medium text-red-600">{estado.erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: OFICINA.corPrimaria }}
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
