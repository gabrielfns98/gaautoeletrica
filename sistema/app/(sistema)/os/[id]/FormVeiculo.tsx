"use client";

import { useActionState } from "react";
import { salvarVeiculo } from "@/app/actions";
import { formatarPlaca } from "@/lib/placa";
import { BOTAO_PRIMARIO, CAMPO as campo, ROTULO as rotulo } from "@/lib/ui";

type Props = {
  osId: string;
  van: { id: string; placa: string; modelo: string; ano: number | null; obs: string | null };
  cliente: { nome: string; telefone: string; obs: string | null };
};

export default function FormVeiculo({ osId, van, cliente }: Props) {
  const [estado, enviar, enviando] = useActionState(salvarVeiculo, null);

  return (
    <form action={enviar} className="mt-3">
      <input type="hidden" name="osId" value={osId} />
      <input type="hidden" name="vanId" value={van.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={rotulo} htmlFor="placa">
            Placa
          </label>
          <input
            id="placa"
            name="placa"
            required
            defaultValue={formatarPlaca(van.placa)}
            autoCapitalize="characters"
            autoComplete="off"
            className={`${campo} font-bold tracking-wider`}
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="ano">
            Ano
          </label>
          <input
            id="ano"
            name="ano"
            inputMode="numeric"
            defaultValue={van.ano ?? ""}
            className={campo}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="modelo">
            Modelo
          </label>
          <input id="modelo" name="modelo" required defaultValue={van.modelo} className={campo} />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="obsVan">
            Observações do veículo
          </label>
          <textarea
            id="obsVan"
            name="obsVan"
            rows={2}
            defaultValue={van.obs ?? ""}
            className={campo}
          />
        </div>

        <div>
          <label className={rotulo} htmlFor="clienteNome">
            Nome do cliente
          </label>
          <input
            id="clienteNome"
            name="clienteNome"
            required
            defaultValue={cliente.nome}
            className={campo}
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="clienteTelefone">
            Telefone (WhatsApp)
          </label>
          <input
            id="clienteTelefone"
            name="clienteTelefone"
            required
            inputMode="tel"
            defaultValue={cliente.telefone}
            className={campo}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={rotulo} htmlFor="obsCliente">
            Observações do cliente
          </label>
          <textarea
            id="obsCliente"
            name="obsCliente"
            rows={2}
            defaultValue={cliente.obs ?? ""}
            className={campo}
          />
        </div>
      </div>

      {estado?.erro && (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {estado.erro}
        </p>
      )}

      {estado && !estado.erro && (
        <p className="mt-2 text-sm font-medium text-emerald-700">Dados corrigidos.</p>
      )}

      <p className="mt-2 text-xs text-slate-500">
        A correção vale para todas as OS deste veículo e deste cliente, inclusive as antigas.
      </p>

      <button
        type="submit"
        disabled={enviando}
        className={`${BOTAO_PRIMARIO} mt-3 w-full py-3 sm:w-auto`}
      >
        {enviando ? "Salvando..." : "Salvar correção"}
      </button>
    </form>
  );
}
