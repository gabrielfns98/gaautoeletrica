"use client";

import { useActionState, useRef } from "react";
import { registrarPagamento, type ResultadoAction } from "@/app/actions";
import { FORMA_LABEL } from "@/lib/financeiro";
import { BOTAO_PRIMARIO, CAMPO, ROTULO } from "@/lib/ui";

const hoje = () => new Date().toISOString().slice(0, 10);

export default function FormPagamento({
  osId,
  sugestaoCentavos,
}: {
  osId: string;
  sugestaoCentavos: number;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [estado, enviar, enviando] = useActionState<ResultadoAction | null, FormData>(
    async (anterior, formData) => {
      const r = await registrarPagamento(anterior, formData);
      if (!r.erro) form.current?.reset();
      return r;
    },
    null,
  );

  const sugestao =
    sugestaoCentavos > 0 ? (sugestaoCentavos / 100).toFixed(2).replace(".", ",") : "";

  return (
    <form ref={form} action={enviar} className="mt-4 border-t border-slate-200 pt-4">
      <input type="hidden" name="osId" value={osId} />
      <p className="text-sm font-bold text-slate-700">Registrar pagamento</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label className={ROTULO} htmlFor="valor-pagamento">
            Valor (R$)
          </label>
          <input
            id="valor-pagamento"
            name="valor"
            inputMode="decimal"
            required
            defaultValue={sugestao}
            placeholder="0,00"
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={ROTULO} htmlFor="forma-pagamento">
            Forma
          </label>
          <select id="forma-pagamento" name="forma" defaultValue="pix" className={CAMPO}>
            {Object.entries(FORMA_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={ROTULO} htmlFor="data-pagamento">
            Data
          </label>
          <input
            id="data-pagamento"
            name="data"
            type="date"
            required
            defaultValue={hoje()}
            className={CAMPO}
          />
        </div>
        <div className="sm:col-span-4">
          <label className={ROTULO} htmlFor="obs-pagamento">
            Observação (opcional)
          </label>
          <input
            id="obs-pagamento"
            name="obs"
            placeholder="Entrada, resto na retirada…"
            className={CAMPO}
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button type="submit" disabled={enviando} className={`${BOTAO_PRIMARIO} w-full py-3`}>
            {enviando ? "..." : "Registrar"}
          </button>
        </div>
      </div>
      {estado?.erro && (
        <p className="mt-2 text-sm font-medium text-red-700">{estado.erro}</p>
      )}
    </form>
  );
}
