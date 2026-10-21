import Link from "next/link";
import { listarOSAbertas } from "@/lib/db";
import { ordenarFila, estaAtrasada } from "@/lib/fila";
import { dataBR, diasNaOficina, resumir } from "@/lib/format";
import { formatarPlaca, normalizarPlaca } from "@/lib/placa";
import { OFICINA } from "@/lib/oficina";
import { STATUS_CLASSE, STATUS_LABEL } from "@/lib/status";
import { alternarFixada, mudarStatus } from "@/app/actions";
import type { OSCompleta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const todas = await listarOSAbertas();
  const termo = busca.toLowerCase();
  const placaBusca = normalizarPlaca(busca);
  const somenteDigitos = busca.replace(/\D/g, "");

  const oss = busca
    ? todas.filter(
        (os) =>
          (placaBusca.length > 0 && os.van.placa.includes(placaBusca)) ||
          os.van.modelo.toLowerCase().includes(termo) ||
          os.van.cliente.nome.toLowerCase().includes(termo) ||
          (somenteDigitos.length > 0 && os.van.cliente.telefone.includes(somenteDigitos)),
      )
    : todas;

  const fila = ordenarFila(
    oss.filter((o) => o.status === "na_fila" || o.status === "em_servico"),
  );
  const aguardando = ordenarFila(oss.filter((o) => o.status === "aguardando_peca"));
  const prontas = ordenarFila(oss.filter((o) => o.status === "pronta"));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/nova"
          className="rounded-lg px-4 py-3 text-center text-base font-bold text-white shadow"
          style={{ backgroundColor: OFICINA.corPrimaria }}
        >
          + Nova entrada
        </Link>
        <form className="flex flex-1 gap-2" action="/">
          <input
            name="q"
            defaultValue={busca}
            placeholder="Buscar placa, nome ou telefone"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-3 text-base"
          />
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-3 text-white">
            Buscar
          </button>
        </form>
      </div>

      {busca && (
        <p className="text-sm text-slate-600">
          Resultados para <strong>{busca}</strong>.{" "}
          <Link href="/" className="text-blue-700 underline">
            limpar busca
          </Link>
        </p>
      )}

      <Secao titulo="Fila de trabalho" vazio="Nenhuma van na fila." itens={fila} numerar />
      <Secao titulo="Aguardando peça" vazio="Nenhuma van esperando peça." itens={aguardando} />
      <Secao titulo="Prontas para retirada" vazio="Nenhuma van pronta." itens={prontas} />
    </div>
  );
}

function Secao({
  titulo,
  itens,
  vazio,
  numerar = false,
}: {
  titulo: string;
  itens: OSCompleta[];
  vazio: string;
  numerar?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        {titulo} <span className="text-slate-400">({itens.length})</span>
      </h2>
      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
          {vazio}
        </p>
      ) : (
        <ul className="space-y-2">
          {itens.map((os, i) => (
            <LinhaOS
              key={os.id}
              os={os}
              posicao={numerar ? i + 1 : null}
              destaque={numerar && i === 0}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function LinhaOS({
  os,
  posicao,
  destaque,
}: {
  os: OSCompleta;
  posicao: number | null;
  destaque: boolean;
}) {
  const atrasada = estaAtrasada(os.previsaoEntrega ? new Date(os.previsaoEntrega) : null);
  const dias = diasNaOficina(new Date(os.dataEntrada));

  return (
    <li
      className={`rounded-lg bg-white p-3 shadow-sm ${
        destaque ? "border-2" : "border border-slate-200"
      }`}
      style={destaque ? { borderColor: OFICINA.corPrimaria } : undefined}
    >
      {destaque && (
        <p
          className="mb-2 text-xs font-bold uppercase tracking-wide"
          style={{ color: OFICINA.corPrimaria }}
        >
          ⬤ Próxima a mexer
        </p>
      )}

      <div className="flex items-start gap-3">
        {posicao !== null && (
          <span className="mt-0.5 shrink-0 text-lg font-black text-slate-400">{posicao}º</span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/os/${os.id}`}
              className="text-base font-bold text-slate-900 underline-offset-2 hover:underline"
            >
              {formatarPlaca(os.van.placa)}
            </Link>
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CLASSE[os.status]}`}>
              {STATUS_LABEL[os.status]}
            </span>
            {os.prioridade === "urgente" && (
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                URGENTE
              </span>
            )}
            {os.fixada && <span className="text-xs font-medium text-amber-600">★ fixada</span>}
          </div>

          <p className="text-sm text-slate-700">
            {os.van.modelo} · {os.van.cliente.nome}
          </p>
          <p className="text-sm text-slate-600">{resumir(os.problemaRelatado)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Previsão:{" "}
            <span className={atrasada ? "font-bold text-red-600" : ""}>
              {dataBR(os.previsaoEntrega)}
              {atrasada && " (atrasada)"}
            </span>{" "}
            · {dias} {dias === 1 ? "dia" : "dias"} na oficina
          </p>
        </div>

        <form action={alternarFixada} className="shrink-0">
          <input type="hidden" name="osId" value={os.id} />
          <input type="hidden" name="fixada" value={os.fixada ? "false" : "true"} />
          <button
            type="submit"
            title={os.fixada ? "Desafixar do topo" : "Fixar no topo"}
            aria-label={os.fixada ? "Desafixar do topo" : "Fixar no topo"}
            className={`rounded px-2 py-1 text-xl leading-none ${
              os.fixada ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
            }`}
          >
            ★
          </button>
        </form>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <BotaoStatus osId={os.id} status="em_servico" label="Iniciar serviço" ativo={os.status === "em_servico"} />
        <BotaoStatus osId={os.id} status="aguardando_peca" label="Aguardando peça" ativo={os.status === "aguardando_peca"} />
        <BotaoStatus osId={os.id} status="pronta" label="Pronta" ativo={os.status === "pronta"} />
        {os.status === "pronta" && (
          <BotaoStatus osId={os.id} status="entregue" label="Entregue" ativo={false} />
        )}
        <Link
          href={`/os/${os.id}`}
          className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Abrir OS
        </Link>
      </div>
    </li>
  );
}

function BotaoStatus({
  osId,
  status,
  label,
  ativo,
}: {
  osId: string;
  status: string;
  label: string;
  ativo: boolean;
}) {
  return (
    <form action={mudarStatus}>
      <input type="hidden" name="osId" value={osId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={ativo}
        className={`rounded px-3 py-2 text-sm font-semibold ${
          ativo
            ? "cursor-default bg-slate-100 text-slate-400"
            : "bg-slate-800 text-white hover:bg-slate-700"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
