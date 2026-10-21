"use client";

import { useActionState } from "react";
import { zerarSistema, type ResultadoAction } from "@/app/actions";
import { CAMPO } from "@/lib/ui";

const CONFIRMACAO = "APAGAR TUDO";

export default function ZonaDePerigo() {
  const [estado, enviar, enviando] = useActionState<ResultadoAction | null, FormData>(
    zerarSistema,
    null,
  );

  return (
    <details className="mt-8 border-t border-slate-200 pt-4">
      <summary className="cursor-pointer text-center text-xs font-medium text-slate-400 hover:text-slate-600">
        Apagar todos os dados do sistema
      </summary>

      <form action={enviar} className="mx-auto mt-3 max-w-md rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-bold text-red-800">Isto apaga tudo, sem volta.</p>
        <p className="mt-1 text-sm text-red-900">
          Vans, clientes, OS, itens, pagamentos e despesas. Não dá para desfazer e não
          existe backup. Use só para começar a oficina do zero.
        </p>
        <label className="mt-3 block text-sm font-medium text-red-900" htmlFor="confirmacao">
          Digite <strong>{CONFIRMACAO}</strong> para confirmar
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          autoComplete="off"
          placeholder={CONFIRMACAO}
          className={`${CAMPO} border-red-300`}
        />
        {estado?.erro && (
          <p className="mt-2 text-sm font-semibold text-red-700">{estado.erro}</p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="mt-3 w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-60"
        >
          {enviando ? "Apagando..." : "Apagar tudo e começar do zero"}
        </button>
      </form>
    </details>
  );
}
