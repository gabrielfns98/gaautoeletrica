"use client";

import { useActionState } from "react";
import { excluirVeiculo } from "@/app/actions";
import { reais } from "@/lib/format";
import { CAMPO } from "@/lib/ui";

type Props = {
  vanId: string;
  placa: string;
  resumo: { os: number; pagamentos: number; recebidoCentavos: number };
};

export default function FormExcluirVeiculo({ vanId, placa, resumo }: Props) {
  const [estado, enviar, enviando] = useActionState(excluirVeiculo, null);

  return (
    <details className="mt-6 border-t border-slate-200 pt-4">
      <summary className="cursor-pointer text-center text-xs font-medium text-slate-400 hover:text-slate-600">
        Excluir este veículo
      </summary>

      <form
        action={enviar}
        className="mx-auto mt-3 max-w-md rounded-xl border border-red-200 bg-red-50 p-4"
      >
        <input type="hidden" name="vanId" value={vanId} />

        <p className="text-sm font-bold text-red-800">Isto apaga o veículo e o que veio com ele.</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-red-900">
          <li>
            {resumo.os} {resumo.os === 1 ? "OS" : "OS"} deste veículo, com peças e mão de obra
          </li>
          <li>
            {resumo.pagamentos}{" "}
            {resumo.pagamentos === 1 ? "pagamento registrado" : "pagamentos registrados"}
            {resumo.recebidoCentavos > 0 && <> ({reais(resumo.recebidoCentavos)} some do Financeiro)</>}
          </li>
          <li>O cliente, se este for o único veículo dele</li>
        </ul>
        <p className="mt-2 text-sm text-red-900">Não dá para desfazer.</p>

        <label className="mt-3 block text-sm font-medium text-red-900" htmlFor="confirmacao">
          Digite a placa <strong>{placa}</strong> para confirmar
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder={placa}
          className={`${CAMPO} border-red-300 font-bold tracking-wider`}
        />

        {estado?.erro && (
          <p className="mt-2 text-sm font-semibold text-red-700">{estado.erro}</p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-3 w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-60"
        >
          {enviando ? "Excluindo..." : "Excluir veículo"}
        </button>
      </form>
    </details>
  );
}
