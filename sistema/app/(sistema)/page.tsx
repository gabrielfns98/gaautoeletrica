import Link from "next/link";
import { listarTodasOS } from "@/lib/db";
import { ordenarFila, estaAtrasada } from "@/lib/fila";
import { dataBR, diasNaOficina, reais, resumir } from "@/lib/format";
import { financeiroDaOS } from "@/lib/financeiro";
import { formatarPlaca, normalizarPlaca } from "@/lib/placa";
import { OFICINA } from "@/lib/oficina";
import { STATUS_LABEL } from "@/lib/status";
import {
  BORDA_STATUS,
  BOTAO_FANTASMA,
  BOTAO_PRIMARIO,
  BOTAO_SECUNDARIO,
  CAMPO,
  CARTAO,
  TITULO_SECAO,
} from "@/lib/ui";
import {
  alternarFixada,
  limparExemplo,
  mudarStatus,
  preencherComExemplo,
} from "@/app/actions";
import type { OSCompleta, StatusOS } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** O próximo passo natural de cada status: um botão só, sem pensar. */
const PROXIMO: Partial<Record<StatusOS, { status: StatusOS; label: string }>> = {
  na_fila: { status: "em_servico", label: "Iniciar serviço" },
  em_servico: { status: "pronta", label: "Marcar pronta" },
  aguardando_peca: { status: "em_servico", label: "Peça chegou, retomar" },
  pronta: { status: "entregue", label: "Cliente retirou" },
};

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const { oss: historico } = await listarTodasOS();
  const todas = historico.filter((os) => os.status !== "entregue");
  const sistemaVazio = historico.length === 0;
  const soExemplo = historico.length > 0 && historico.every((os) => os.demo);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          href="/nova"
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-bold text-white shadow-sm transition hover:brightness-110"
          style={{ backgroundColor: OFICINA.corPrimaria }}
        >
          <span className="text-lg leading-none">+</span> Nova entrada
        </Link>
        <form className="flex flex-1 gap-2" action="/">
          <input
            name="q"
            defaultValue={busca}
            placeholder="Buscar placa, nome ou telefone"
            aria-label="Buscar"
            className={`${CAMPO} mt-0 min-w-0 flex-1 py-3`}
          />
          <button type="submit" className={`${BOTAO_SECUNDARIO} px-4`}>
            Buscar
          </button>
        </form>
      </div>

      {busca && (
        <p className="text-sm text-slate-600">
          {oss.length} {oss.length === 1 ? "resultado" : "resultados"} para{" "}
          <strong>{busca}</strong> ·{" "}
          <Link href="/" className="font-medium text-slate-900 underline">
            limpar
          </Link>
        </p>
      )}

      {sistemaVazio && !busca && (
        <section className={`${CARTAO} p-5 text-center`}>
          <h2 className="text-base font-bold">Sistema ainda vazio</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Clique em <strong>Nova entrada</strong> para registrar a primeira van. Ou
            preencha com dados de exemplo para conhecer o sistema — depois é só limpar.
          </p>
          <form action={preencherComExemplo} className="mt-3">
            <button type="submit" className={BOTAO_SECUNDARIO}>
              Preencher com dados de exemplo
            </button>
          </form>
        </section>
      )}

      <Secao titulo="Fila de trabalho" vazio="Nenhuma van na fila." itens={fila} numerar />
      <Secao
        titulo="Aguardando peça"
        vazio="Nenhuma van esperando peça."
        itens={aguardando}
      />
      <Secao titulo="Prontas para retirada" vazio="Nenhuma van pronta." itens={prontas} />

      {soExemplo && (
        <form action={limparExemplo} className="border-t border-slate-200 pt-4 text-center">
          <p className="text-xs text-slate-500">
            Estes são dados de exemplo, para demonstração.
          </p>
          <button
            type="submit"
            className="mt-1 text-xs font-semibold text-slate-600 underline hover:text-red-700"
          >
            Apagar os dados de exemplo e começar do zero
          </button>
        </form>
      )}
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
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className={TITULO_SECAO}>{titulo}</h2>
        <span className="text-xs font-semibold text-slate-400">{itens.length}</span>
      </div>
      {itens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
          {vazio}
        </p>
      ) : (
        <ul className="space-y-2.5">
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
  const fin = financeiroDaOS(os);
  const proximo = PROXIMO[os.status];

  return (
    <li className={`relative flex overflow-hidden ${CARTAO}`}>
      <span
        aria-hidden
        className={`w-1.5 shrink-0 ${BORDA_STATUS[os.status] ?? "bg-slate-300"}`}
      />

      <div className="min-w-0 flex-1 p-3.5 sm:p-4">
        {destaque && (
          <p
            className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: OFICINA.corPrimaria }}
          >
            Próxima a mexer
          </p>
        )}

        <div className="flex items-start gap-3">
          {posicao !== null && (
            <span className="mt-0.5 w-7 shrink-0 text-center text-lg font-black tabular-nums text-slate-300">
              {posicao}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/os/${os.id}`}
                className="text-lg font-bold tracking-tight text-slate-900 hover:underline"
              >
                {formatarPlaca(os.van.placa)}
              </Link>
              <span className="text-xs font-medium text-slate-500">
                {STATUS_LABEL[os.status]}
              </span>
              {os.prioridade === "urgente" && (
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-bold uppercase text-red-700 ring-1 ring-red-200">
                  Urgente
                </span>
              )}
              {os.fixada && (
                <span className="text-[11px] font-semibold text-amber-600">★ fixada</span>
              )}
            </div>

            <p className="mt-0.5 truncate text-sm font-medium text-slate-700">
              {os.van.modelo} · {os.van.cliente.nome}
            </p>
            <p className="text-sm text-slate-500">{resumir(os.problemaRelatado)}</p>

            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
              <span>
                {dias} {dias === 1 ? "dia" : "dias"} na oficina
              </span>
              <span className={atrasada ? "font-bold text-red-600" : ""}>
                Previsão {dataBR(os.previsaoEntrega)}
                {atrasada && " · atrasada"}
              </span>
              {fin.totalCentavos > 0 && (
                <span>
                  {reais(fin.totalCentavos)}
                  {fin.saldoCentavos > 0 ? (
                    <span className="text-amber-700">
                      {" "}
                      · falta {reais(fin.saldoCentavos)}
                    </span>
                  ) : (
                    <span className="text-emerald-700"> · pago</span>
                  )}
                </span>
              )}
            </p>
          </div>

          <form action={alternarFixada} className="shrink-0">
            <input type="hidden" name="osId" value={os.id} />
            <input type="hidden" name="fixada" value={os.fixada ? "false" : "true"} />
            <button
              type="submit"
              title={os.fixada ? "Desafixar do topo" : "Fixar no topo"}
              aria-label={os.fixada ? "Desafixar do topo" : "Fixar no topo"}
              className={`rounded-lg px-2 py-1 text-xl leading-none transition ${
                os.fixada
                  ? "text-amber-500"
                  : "text-slate-200 hover:bg-slate-100 hover:text-amber-400"
              }`}
            >
              ★
            </button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {proximo && (
            <form action={mudarStatus}>
              <input type="hidden" name="osId" value={os.id} />
              <input type="hidden" name="status" value={proximo.status} />
              <button type="submit" className={BOTAO_PRIMARIO}>
                {proximo.label}
              </button>
            </form>
          )}
          {(os.status === "na_fila" || os.status === "em_servico") && (
            <form action={mudarStatus}>
              <input type="hidden" name="osId" value={os.id} />
              <input type="hidden" name="status" value="aguardando_peca" />
              <button type="submit" className={BOTAO_SECUNDARIO}>
                Falta peça
              </button>
            </form>
          )}
          <Link href={`/os/${os.id}`} className={`${BOTAO_FANTASMA} ml-auto`}>
            Abrir OS →
          </Link>
        </div>
      </div>
    </li>
  );
}
