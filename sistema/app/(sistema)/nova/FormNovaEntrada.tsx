"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { criarEntrada, type ResultadoAction } from "@/app/actions";
import { formatarPlaca, normalizarPlaca, placaValida } from "@/lib/placa";
import { dataBR } from "@/lib/format";

type UltimaOS = {
  id: string;
  numero: number;
  dataEntrada: string;
  problemaRelatado: string;
  problemaReal: string | null;
  servicoFeito: string | null;
};

type VanEncontrada = {
  id: string;
  placa: string;
  modelo: string;
  ano: number | null;
  obs: string | null;
  cliente: { id: string; nome: string; telefone: string };
  ultimasOS: UltimaOS[];
};

const campo = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-base";
const rotulo = "block text-sm font-medium text-slate-700";

export default function FormNovaEntrada() {
  const [estado, enviar, enviando] = useActionState<ResultadoAction | null, FormData>(
    criarEntrada,
    null,
  );

  const [placa, setPlaca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [van, setVan] = useState<VanEncontrada | null>(null);
  const [erroPlaca, setErroPlaca] = useState<string | null>(null);

  async function buscarPlaca() {
    const p = normalizarPlaca(placa);
    if (!placaValida(p)) {
      setErroPlaca("Placa inválida. Use ABC1234 ou ABC1D23.");
      return;
    }
    setErroPlaca(null);
    setBuscando(true);
    const res = await fetch(`/api/van?placa=${encodeURIComponent(p)}`);
    const dados = await res.json();
    setVan(dados.encontrada ? dados.van : null);
    setBuscou(true);
    setBuscando(false);
  }

  function trocarPlaca(valor: string) {
    setPlaca(valor);
    setBuscou(false);
    setVan(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className={rotulo} htmlFor="placa-busca">
          Placa da van
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="placa-busca"
            value={placa}
            onChange={(e) => trocarPlaca(e.target.value.toUpperCase())}
            placeholder="ABC1D23"
            autoCapitalize="characters"
            autoComplete="off"
            className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-3 text-lg font-bold tracking-wider"
          />
          <button
            type="button"
            onClick={buscarPlaca}
            disabled={buscando}
            className="rounded bg-slate-800 px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {buscando ? "..." : "Buscar"}
          </button>
        </div>
        {erroPlaca && <p className="mt-2 text-sm font-medium text-red-600">{erroPlaca}</p>}
        {buscou && van && (
          <p className="mt-2 text-sm font-medium text-green-700">
            Van já cadastrada de {van.cliente.nome}. Os dados abaixo foram preenchidos.
          </p>
        )}
        {buscou && !van && (
          <p className="mt-2 text-sm font-medium text-amber-700">
            Van nova. Cadastre a van e o cliente abaixo.
          </p>
        )}
      </div>

      {buscou && van && van.ultimasOS.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Já veio por isso antes?</p>
          <ul className="mt-2 space-y-2">
            {van.ultimasOS.map((os) => (
              <li key={os.id} className="text-sm text-slate-700">
                <strong>{dataBR(os.dataEntrada)}</strong> — {os.problemaRelatado}
                {os.problemaReal && (
                  <>
                    <br />
                    <span className="text-slate-600">Diagnóstico: {os.problemaReal}</span>
                  </>
                )}
                {os.servicoFeito && (
                  <>
                    <br />
                    <span className="text-slate-600">Feito: {os.servicoFeito}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <Link
            href={`/van/${van.placa}`}
            className="mt-2 inline-block text-sm text-blue-700 underline"
          >
            ver histórico completo de {formatarPlaca(van.placa)}
          </Link>
        </div>
      )}

      {buscou && (
        <form action={enviar} className="space-y-4">
          <input type="hidden" name="placa" value={normalizarPlaca(placa)} />
          {van && <input type="hidden" name="clienteId" value={van.cliente.id} />}

          <fieldset className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <legend className="px-1 text-sm font-bold text-slate-600">Van</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={rotulo} htmlFor="modelo">
                  Modelo *
                </label>
                <input
                  id="modelo"
                  name="modelo"
                  required
                  defaultValue={van?.modelo ?? ""}
                  placeholder="Mercedes-Benz Sprinter 415"
                  className={campo}
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
                  defaultValue={van?.ano ?? ""}
                  className={campo}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={rotulo} htmlFor="obsVan">
                  Observações da van
                </label>
                <textarea
                  id="obsVan"
                  name="obsVan"
                  rows={2}
                  defaultValue={van?.obs ?? ""}
                  className={campo}
                />
              </div>
            </div>
          </fieldset>

          {van ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <p className="font-bold text-slate-600">Cliente</p>
              <p className="mt-1 text-base font-semibold">{van.cliente.nome}</p>
              <p className="text-slate-600">{van.cliente.telefone}</p>
            </div>
          ) : (
            <fieldset className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <legend className="px-1 text-sm font-bold text-slate-600">Cliente novo</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={rotulo} htmlFor="clienteNome">
                    Nome *
                  </label>
                  <input id="clienteNome" name="clienteNome" required className={campo} />
                </div>
                <div>
                  <label className={rotulo} htmlFor="clienteTelefone">
                    Telefone (WhatsApp) *
                  </label>
                  <input
                    id="clienteTelefone"
                    name="clienteTelefone"
                    required
                    inputMode="tel"
                    placeholder="11988887777"
                    className={campo}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={rotulo} htmlFor="obsCliente">
                    Observações do cliente
                  </label>
                  <textarea id="obsCliente" name="obsCliente" rows={2} className={campo} />
                </div>
              </div>
            </fieldset>
          )}

          <fieldset className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <legend className="px-1 text-sm font-bold text-slate-600">Entrada</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={rotulo} htmlFor="problemaRelatado">
                  Problema relatado pelo cliente *
                </label>
                <textarea
                  id="problemaRelatado"
                  name="problemaRelatado"
                  required
                  rows={3}
                  className={campo}
                />
              </div>
              <div>
                <label className={rotulo} htmlFor="km">
                  Km de entrada
                </label>
                <input id="km" name="km" inputMode="numeric" className={campo} />
              </div>
              <div>
                <label className={rotulo} htmlFor="prioridade">
                  Prioridade
                </label>
                <select id="prioridade" name="prioridade" defaultValue="normal" className={campo}>
                  <option value="normal">Normal</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div>
                <label className={rotulo} htmlFor="previsaoEntrega">
                  Previsão de entrega (opcional)
                </label>
                <input
                  id="previsaoEntrega"
                  name="previsaoEntrega"
                  type="date"
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
            className="w-full rounded-lg bg-blue-700 px-4 py-3 text-base font-bold text-white disabled:opacity-60"
          >
            {enviando ? "Salvando..." : "Registrar entrada e abrir OS"}
          </button>
        </form>
      )}
    </div>
  );
}
