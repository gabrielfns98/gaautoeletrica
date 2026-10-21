"use client";

import { useActionState, useRef } from "react";
import { adicionarDespesa, type ResultadoAction } from "@/app/actions";
import { CATEGORIA_LABEL } from "@/lib/financeiro";
import { BOTAO_PRIMARIO, CAMPO, CARTAO_PAD, ROTULO } from "@/lib/ui";

const hoje = () => new Date().toISOString().slice(0, 10);

export default function FormDespesa() {
  const form = useRef<HTMLFormElement>(null);
  const [estado, enviar, enviando] = useActionState<ResultadoAction | null, FormData>(
    async (anterior, formData) => {
      const r = await adicionarDespesa(anterior, formData);
      if (!r.erro) form.current?.reset();
      return r;
    },
    null,
  );

  return (
    <form ref={form} action={enviar} className={`mt-2.5 ${CARTAO_PAD}`}>
      <p className="text-sm font-bold text-slate-700">Lançar despesa</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label className={ROTULO} htmlFor="descricao-despesa">
            Descrição
          </label>
          <input
            id="descricao-despesa"
            name="descricao"
            required
            placeholder="Aluguel de outubro"
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-3">
          <label className={ROTULO} htmlFor="categoria-despesa">
            Categoria
          </label>
          <select
            id="categoria-despesa"
            name="categoria"
            defaultValue="outros"
            className={CAMPO}
          >
            {Object.entries(CATEGORIA_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={ROTULO} htmlFor="data-despesa">
            Data
          </label>
          <input
            id="data-despesa"
            name="data"
            type="date"
            required
            defaultValue={hoje()}
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={ROTULO} htmlFor="valor-despesa">
            Valor (R$)
          </label>
          <input
            id="valor-despesa"
            name="valor"
            inputMode="decimal"
            required
            placeholder="0,00"
            className={CAMPO}
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button type="submit" disabled={enviando} className={`${BOTAO_PRIMARIO} w-full py-3`}>
            {enviando ? "..." : "Lançar despesa"}
          </button>
        </div>
      </div>
      {estado?.erro && (
        <p className="mt-2 text-sm font-medium text-red-700">{estado.erro}</p>
      )}
    </form>
  );
}
