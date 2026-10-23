import Link from "next/link";
import { listarTodasOS } from "@/lib/db";
import { dataBR, reais, resumir } from "@/lib/format";
import { financeiroDaOS } from "@/lib/financeiro";
import { formatarPlaca, normalizarPlaca } from "@/lib/placa";
import { numeroOrcamento } from "@/lib/oficina";
import { BOTAO_SECUNDARIO, CAMPO, CARTAO, TITULO_SECAO } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Histórico" };

export default async function Historico({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const { oss } = await listarTodasOS();
  const entregues = oss.filter((os) => os.status === "entregue");

  const termo = busca.toLowerCase();
  const placaBusca = normalizarPlaca(busca);
  const somenteDigitos = busca.replace(/\D/g, "");

  const encontradas = busca
    ? entregues.filter(
        (os) =>
          (placaBusca.length > 0 && os.van.placa.includes(placaBusca)) ||
          os.van.modelo.toLowerCase().includes(termo) ||
          os.van.cliente.nome.toLowerCase().includes(termo) ||
          (somenteDigitos.length > 0 && os.van.cliente.telefone.includes(somenteDigitos)),
      )
    : entregues;

  // o mais recente primeiro; OS antiga sem data de entrega cai para o fim
  const lista = [...encontradas].sort((a, b) =>
    (b.dataEntrega ?? "").localeCompare(a.dataEntrega ?? ""),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Histórico</h1>
        <p className="text-sm text-slate-500">
          Carros já entregues, do mais recente para o mais antigo.
        </p>
      </div>

      <form className="flex gap-2" action="/historico">
        <input
          name="q"
          defaultValue={busca}
          placeholder="Buscar placa, modelo, nome ou telefone"
          aria-label="Buscar no histórico"
          className={`${CAMPO} mt-0 min-w-0 flex-1 py-3`}
        />
        <button type="submit" className={`${BOTAO_SECUNDARIO} px-4`}>
          Buscar
        </button>
      </form>

      {busca && (
        <p className="text-sm text-slate-600">
          {lista.length} {lista.length === 1 ? "resultado" : "resultados"} para{" "}
          <strong>{busca}</strong> ·{" "}
          <Link href="/historico" className="font-medium text-slate-900 underline">
            limpar
          </Link>
        </p>
      )}

      <section>
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className={TITULO_SECAO}>Entregues</h2>
          <span className="text-xs font-semibold text-slate-400">{lista.length}</span>
        </div>

        {lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
            {busca
              ? "Nenhum carro entregue bate com essa busca."
              : "Nenhum carro entregue ainda. Quando você marcar uma OS como entregue, ela aparece aqui."}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {lista.map((os) => {
              const fin = financeiroDaOS(os);
              return (
                <li key={os.id} className={`${CARTAO} p-3.5 sm:p-4`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/os/${os.id}`}
                      className="text-lg font-bold tracking-tight text-slate-900 hover:underline"
                    >
                      {formatarPlaca(os.van.placa)}
                    </Link>
                    <span className="text-xs font-medium text-slate-500">
                      {numeroOrcamento(os.numero)}
                    </span>
                    {os.dataEntrega && (
                      <span className="text-xs text-slate-500">
                        entregue em {dataBR(os.dataEntrega)}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-sm font-medium text-slate-700">
                    {os.van.modelo} · {os.van.cliente.nome}
                  </p>
                  <p className="text-sm text-slate-500">
                    {resumir(os.servicoFeito ?? os.problemaRelatado)}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-semibold tabular-nums text-slate-900">
                      {reais(fin.totalCentavos)}
                    </span>
                    {fin.saldoCentavos > 0 ? (
                      <span className="font-medium text-amber-700">
                        falta {reais(fin.saldoCentavos)}
                      </span>
                    ) : (
                      <span className="font-medium text-emerald-700">pago</span>
                    )}
                    <Link
                      href={`/van/${os.van.placa}`}
                      className="ml-auto font-medium text-slate-500 underline hover:text-slate-800"
                    >
                      Histórico da van →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
