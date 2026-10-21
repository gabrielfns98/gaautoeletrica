import Link from "next/link";
import { listarTodasOS } from "@/lib/db";
import { dataBR, reais } from "@/lib/format";
import {
  CATEGORIA_LABEL,
  FORMA_LABEL,
  financeiroDaOS,
  mesAtual,
  nomeDoMes,
  mesDe,
  resumoDoMes,
} from "@/lib/financeiro";
import { formatarPlaca } from "@/lib/placa";
import { numeroOrcamento, OFICINA } from "@/lib/oficina";
import { BOTAO_SECUNDARIO, CARTAO, CARTAO_PAD, TITULO_SECAO } from "@/lib/ui";
import { removerDespesa } from "@/app/actions";
import FormDespesa from "./FormDespesa";

export const dynamic = "force-dynamic";

const MES_VALIDO = /^\d{4}-\d{2}$/;

export default async function Financeiro({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam && MES_VALIDO.test(mesParam) ? mesParam : mesAtual();

  const { oss, despesas } = await listarTodasOS();
  const resumo = resumoDoMes(oss, despesas, mes);

  const aReceber = oss
    .map((os) => ({ os, fin: financeiroDaOS(os) }))
    .filter(({ fin }) => fin.saldoCentavos > 0)
    .sort((a, b) => b.fin.saldoCentavos - a.fin.saldoCentavos);

  const pagamentosDoMes = oss
    .flatMap((os) => os.pagamentos.map((p) => ({ p, os })))
    .filter(({ p }) => mesDe(p.data) === mes)
    .sort((a, b) => b.p.data.localeCompare(a.p.data));

  const despesasDoMes = despesas.filter((d) => mesDe(d.data) === mes);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-slate-500">{nomeDoMes(mes)}</p>
        </div>
        <form action="/financeiro" className="flex items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Mês</span>
            <input
              type="month"
              name="mes"
              defaultValue={mes}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <button type="submit" className={BOTAO_SECUNDARIO}>
            Ver
          </button>
        </form>
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Indicador
          titulo="Faturado"
          valor={reais(resumo.faturadoCentavos)}
          nota={`${resumo.osEntregues} ${resumo.osEntregues === 1 ? "OS entregue" : "OS entregues"}`}
        />
        <Indicador
          titulo="Custo de peças"
          valor={`− ${reais(resumo.custoPecasCentavos)}`}
          nota="o que você pagou"
        />
        <Indicador
          titulo="Despesas"
          valor={`− ${reais(resumo.despesasCentavos)}`}
          nota="aluguel, salários…"
        />
        <Indicador
          titulo={resumo.lucroCentavos < 0 ? "Prejuízo" : "Lucro"}
          valor={
            resumo.lucroCentavos < 0
              ? `− ${reais(-resumo.lucroCentavos)}`
              : reais(resumo.lucroCentavos)
          }
          nota="faturado − custo − despesas"
          destaque
          ruim={resumo.lucroCentavos < 0}
        />
      </section>

      <section className="grid gap-2.5 sm:grid-cols-2">
        <Indicador
          titulo="Recebido no mês"
          valor={reais(resumo.recebidoCentavos)}
          nota="dinheiro que entrou no caixa"
        />
        <Indicador
          titulo="A receber (total)"
          valor={reais(resumo.aReceberCentavos)}
          nota={`${aReceber.length} ${aReceber.length === 1 ? "OS em aberto" : "OS em aberto"}`}
          negativo={resumo.aReceberCentavos > 0}
        />
      </section>

      <section>
        <h2 className={`mb-2 ${TITULO_SECAO}`}>A receber</h2>
        {aReceber.length === 0 ? (
          <Vazio texto="Nenhuma OS com saldo em aberto. Tudo pago." />
        ) : (
          <ul className={`divide-y divide-slate-100 ${CARTAO}`}>
            {aReceber.map(({ os, fin }) => (
              <li key={os.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/os/${os.id}`}
                    className="font-bold text-slate-900 hover:underline"
                  >
                    {formatarPlaca(os.van.placa)}
                  </Link>
                  <p className="truncate text-sm text-slate-500">
                    {numeroOrcamento(os.numero)} · {os.van.cliente.nome}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-amber-700">{reais(fin.saldoCentavos)}</p>
                  <p className="text-xs text-slate-500">
                    de {reais(fin.totalCentavos)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className={`mb-2 ${TITULO_SECAO}`}>Pagamentos recebidos no mês</h2>
        {pagamentosDoMes.length === 0 ? (
          <Vazio texto="Nenhum pagamento lançado neste mês." />
        ) : (
          <ul className={`divide-y divide-slate-100 ${CARTAO}`}>
            {pagamentosDoMes.map(({ p, os }) => (
              <li key={p.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/os/${os.id}`}
                    className="font-semibold text-slate-900 hover:underline"
                  >
                    {formatarPlaca(os.van.placa)}
                  </Link>
                  <p className="truncate text-sm text-slate-500">
                    {dataBR(p.data)} · {FORMA_LABEL[p.forma]}
                    {p.obs ? ` · ${p.obs}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-bold text-emerald-700">
                  + {reais(p.valorCentavos)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className={`mb-2 ${TITULO_SECAO}`}>Despesas do mês</h2>
        {despesasDoMes.length === 0 ? (
          <Vazio texto="Nenhuma despesa lançada neste mês." />
        ) : (
          <ul className={`divide-y divide-slate-100 ${CARTAO}`}>
            {despesasDoMes.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{d.descricao}</p>
                  <p className="text-sm text-slate-500">
                    {dataBR(d.data)} · {CATEGORIA_LABEL[d.categoria]}
                  </p>
                </div>
                <p className="shrink-0 font-bold text-slate-900">
                  − {reais(d.valorCentavos)}
                </p>
                <form action={removerDespesa} className="shrink-0">
                  <input type="hidden" name="despesaId" value={d.id} />
                  <button
                    type="submit"
                    aria-label={`Remover ${d.descricao}`}
                    className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <FormDespesa />
      </section>

      <p className="text-xs leading-relaxed text-slate-500">
        Como as contas são feitas: <strong>faturado</strong> é a soma das OS marcadas como
        entregues neste mês. <strong>Recebido</strong> é o dinheiro que entrou no mês, mesmo
        de OS antigas. <strong>A receber</strong> é tudo que falta receber, de qualquer mês.
        O custo das peças fica só aqui — nunca aparece no orçamento do cliente.
      </p>
    </div>
  );
}

function Indicador({
  titulo,
  valor,
  nota,
  destaque = false,
  negativo = false,
  ruim = false,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  destaque?: boolean;
  negativo?: boolean;
  ruim?: boolean;
}) {
  const borda = ruim ? "#B91C1C" : OFICINA.corPrimaria;
  return (
    <div
      className={`${CARTAO} p-3.5`}
      style={destaque ? { borderColor: borda, borderWidth: 2 } : undefined}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {titulo}
      </p>
      <p
        className={`mt-1 text-lg font-black tabular-nums tracking-tight sm:text-xl ${
          ruim ? "text-red-700" : negativo ? "text-amber-700" : "text-slate-900"
        }`}
        style={destaque && !ruim ? { color: OFICINA.corPrimaria } : undefined}
      >
        {valor}
      </p>
      {nota && <p className="mt-0.5 text-[11px] text-slate-500">{nota}</p>}
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
      {texto}
    </p>
  );
}

export const metadata = { title: "Financeiro" };
