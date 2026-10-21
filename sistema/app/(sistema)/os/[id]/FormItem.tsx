"use client";

import { useActionState, useRef } from "react";
import { adicionarItem, type ResultadoAction } from "@/app/actions";
import { TIPO_ITEM_LABEL } from "@/lib/status";
import { BOTAO_PRIMARIO, CAMPO as campo, ROTULO as rotulo } from "@/lib/ui";

export default function FormItem({ osId }: { osId: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [estado, enviar, enviando] = useActionState<ResultadoAction | null, FormData>(
    async (anterior, formData) => {
      const r = await adicionarItem(anterior, formData);
      if (!r.erro) form.current?.reset();
      return r;
    },
    null,
  );

  return (
    <form ref={form} action={enviar} className="mt-4 border-t border-slate-200 pt-4">
      <input type="hidden" name="osId" value={osId} />
      <p className="text-sm font-bold text-slate-700">Adicionar peça ou serviço</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="tipo">
            Tipo
          </label>
          <select id="tipo" name="tipo" defaultValue="peca_comprada" className={campo}>
            {Object.entries(TIPO_ITEM_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4">
          <label className={rotulo} htmlFor="descricao">
            Descrição
          </label>
          <input id="descricao" name="descricao" required className={campo} />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="quantidade">
            Qtd
          </label>
          <input
            id="quantidade"
            name="quantidade"
            inputMode="numeric"
            defaultValue="1"
            className={campo}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="valorUnitario">
            Preço ao cliente (R$)
          </label>
          <input
            id="valorUnitario"
            name="valorUnitario"
            inputMode="decimal"
            required
            placeholder="0,00"
            className={campo}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="custoUnitario">
            Seu custo (R$){" "}
            <span className="font-normal text-slate-400">opcional</span>
          </label>
          <input
            id="custoUnitario"
            name="custoUnitario"
            inputMode="decimal"
            placeholder="0,00"
            className={campo}
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            disabled={enviando}
            className={`${BOTAO_PRIMARIO} w-full py-3`}
          >
            {enviando ? "..." : "Adicionar"}
          </button>
        </div>
      </div>
      {estado?.erro && (
        <p className="mt-2 text-sm font-medium text-red-700">{estado.erro}</p>
      )}
    </form>
  );
}
