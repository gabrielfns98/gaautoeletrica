"use client";

import { useActionState } from "react";
import { salvarOS, type ResultadoAction } from "@/app/actions";
import { STATUS_LABEL, PRIORIDADE_LABEL } from "@/lib/status";
import { BOTAO_PRIMARIO, CAMPO as campo, CARTAO_PAD, ROTULO as rotulo } from "@/lib/ui";

type OSForm = {
  id: string;
  problemaRelatado: string;
  problemaReal: string | null;
  servicoFeito: string | null;
  km: number | null;
  prioridade: "normal" | "urgente";
  status: keyof typeof STATUS_LABEL;
  previsaoEntrega: string | null;
  descontoCentavos: number;
  validadeDias: number;
  observacoesOrcamento: string | null;
};

export default function FormOS({ os }: { os: OSForm }) {
  const [estado, enviar, enviando] = useActionState<ResultadoAction | null, FormData>(
    salvarOS,
    null,
  );

  const previsao = os.previsaoEntrega ? os.previsaoEntrega.slice(0, 10) : "";
  const desconto = (os.descontoCentavos / 100).toFixed(2).replace(".", ",");

  return (
    <form action={enviar} className="space-y-4">
      <input type="hidden" name="osId" value={os.id} />

      <fieldset className={CARTAO_PAD}>
        <legend className="px-1 text-sm font-bold text-slate-700">Serviço</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={rotulo} htmlFor="problemaRelatado">
              Problema relatado
            </label>
            <textarea
              id="problemaRelatado"
              name="problemaRelatado"
              rows={2}
              required
              defaultValue={os.problemaRelatado}
              className={campo}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo} htmlFor="problemaReal">
              Problema real (diagnóstico)
            </label>
            <textarea
              id="problemaReal"
              name="problemaReal"
              rows={3}
              defaultValue={os.problemaReal ?? ""}
              className={campo}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo} htmlFor="servicoFeito">
              Serviço feito
            </label>
            <textarea
              id="servicoFeito"
              name="servicoFeito"
              rows={3}
              defaultValue={os.servicoFeito ?? ""}
              className={campo}
            />
          </div>
          <div>
            <label className={rotulo} htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={os.status} className={campo}>
              {Object.entries(STATUS_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="prioridade">
              Prioridade
            </label>
            <select
              id="prioridade"
              name="prioridade"
              defaultValue={os.prioridade}
              className={campo}
            >
              {Object.entries(PRIORIDADE_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={rotulo} htmlFor="previsaoEntrega">
              Previsão de entrega
            </label>
            <input
              id="previsaoEntrega"
              name="previsaoEntrega"
              type="date"
              defaultValue={previsao}
              className={campo}
            />
          </div>
          <div>
            <label className={rotulo} htmlFor="km">
              Km
            </label>
            <input
              id="km"
              name="km"
              inputMode="numeric"
              defaultValue={os.km ?? ""}
              className={campo}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className={CARTAO_PAD}>
        <legend className="px-1 text-sm font-bold text-slate-700">Dados do orçamento</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={rotulo} htmlFor="desconto">
              Desconto (R$)
            </label>
            <input
              id="desconto"
              name="desconto"
              inputMode="decimal"
              defaultValue={desconto}
              className={campo}
            />
          </div>
          <div>
            <label className={rotulo} htmlFor="validadeDias">
              Validade (dias)
            </label>
            <input
              id="validadeDias"
              name="validadeDias"
              inputMode="numeric"
              defaultValue={os.validadeDias}
              className={campo}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo} htmlFor="observacoesOrcamento">
              Observações e condições
            </label>
            <textarea
              id="observacoesOrcamento"
              name="observacoesOrcamento"
              rows={5}
              defaultValue={os.observacoesOrcamento ?? ""}
              className={campo}
            />
          </div>
        </div>
      </fieldset>

      {estado?.erro && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className={`${BOTAO_PRIMARIO} w-full py-3 text-base sm:w-auto`}
      >
        {enviando ? "Salvando..." : "Salvar OS"}
      </button>
    </form>
  );
}
