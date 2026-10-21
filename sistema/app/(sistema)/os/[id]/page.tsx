import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarOS } from "@/lib/db";
import { reais, dataBR, diasNaOficina } from "@/lib/format";
import { financeiroDaOS, FORMA_LABEL } from "@/lib/financeiro";
import { formatarPlaca } from "@/lib/placa";
import { numeroOrcamento, OFICINA } from "@/lib/oficina";
import { calcularTotais } from "@/lib/orcamento";
import { STATUS_LABEL, TIPO_ITEM_LABEL } from "@/lib/status";
import { BOTAO_FANTASMA, CARTAO_PAD, TITULO_SECAO } from "@/lib/ui";
import { removerItem, removerPagamento } from "@/app/actions";
import FormOS from "./FormOS";
import FormItem from "./FormItem";
import FormPagamento from "./FormPagamento";

export const dynamic = "force-dynamic";

export default async function FichaOS({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const os = await buscarOS(id);

  if (!os) notFound();

  const totais = calcularTotais(os.itens, os.descontoCentavos);
  const fin = financeiroDaOS(os);
  const dias = diasNaOficina(new Date(os.dataEntrada));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {numeroOrcamento(os.numero)} · {STATUS_LABEL[os.status]}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {formatarPlaca(os.van.placa)}
          </h1>
          <p className="text-sm font-medium text-slate-700">
            {os.van.modelo}
            {os.van.ano ? ` (${os.van.ano})` : ""} · {os.van.cliente.nome} ·{" "}
            {os.van.cliente.telefone}
          </p>
          <p className="text-xs text-slate-500">
            Entrada em {dataBR(os.dataEntrada)} · {dias} {dias === 1 ? "dia" : "dias"} na
            oficina
            {os.km ? ` · ${os.km.toLocaleString("pt-BR")} km` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Link href={`/van/${os.van.placa}`} className={BOTAO_FANTASMA}>
            Histórico
          </Link>
          <Link href="/" className={BOTAO_FANTASMA}>
            Painel
          </Link>
        </div>
      </div>

      <FormOS
        os={{
          id: os.id,
          problemaRelatado: os.problemaRelatado,
          problemaReal: os.problemaReal,
          servicoFeito: os.servicoFeito,
          km: os.km,
          prioridade: os.prioridade,
          status: os.status,
          previsaoEntrega: os.previsaoEntrega,
          descontoCentavos: os.descontoCentavos,
          validadeDias: os.validadeDias,
          observacoesOrcamento: os.observacoesOrcamento,
        }}
      />

      <section className={CARTAO_PAD}>
        <h2 className={TITULO_SECAO}>Peças e serviços</h2>

        {os.itens.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum item lançado.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {os.itens.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.descricao}</p>
                  <p className="text-xs text-slate-500">
                    {TIPO_ITEM_LABEL[item.tipo]} · {item.quantidade} ×{" "}
                    {reais(item.valorUnitarioCentavos)}
                    {item.custoUnitarioCentavos > 0 && (
                      <span className="text-slate-400">
                        {" "}
                        · custo {reais(item.custoUnitarioCentavos)}
                      </span>
                    )}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {reais(item.quantidade * item.valorUnitarioCentavos)}
                </p>
                <form action={removerItem} className="shrink-0">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="osId" value={os.id} />
                  <button
                    type="submit"
                    aria-label={`Remover ${item.descricao}`}
                    className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
          <Linha rotulo="Peças" valor={reais(totais.pecasCentavos)} />
          <Linha rotulo="Mão de obra" valor={reais(totais.maoDeObraCentavos)} />
          <Linha rotulo="Subtotal" valor={reais(totais.subtotalCentavos)} />
          {totais.descontoCentavos > 0 && (
            <Linha rotulo="Desconto" valor={`− ${reais(totais.descontoCentavos)}`} />
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <dt>Total cobrado</dt>
            <dd className="tabular-nums">{reais(totais.totalCentavos)}</dd>
          </div>
        </dl>

        <FormItem osId={os.id} />
      </section>

      <section className={CARTAO_PAD}>
        <h2 className={TITULO_SECAO}>Financeiro desta OS</h2>

        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Numero rotulo="Total" valor={reais(fin.totalCentavos)} />
          <Numero rotulo="Já pago" valor={reais(fin.pagoCentavos)} cor="text-emerald-700" />
          <Numero
            rotulo="Falta receber"
            valor={reais(fin.saldoCentavos)}
            cor={fin.saldoCentavos > 0 ? "text-amber-700" : "text-slate-400"}
          />
          <Numero
            rotulo="Lucro"
            valor={reais(fin.lucroCentavos)}
            nota={`custo ${reais(fin.custoCentavos)}`}
          />
        </div>

        {fin.quitada && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            OS quitada.
          </p>
        )}

        {os.pagamentos.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-200">
            {os.pagamentos.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {reais(p.valorCentavos)} · {FORMA_LABEL[p.forma]}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dataBR(p.data)}
                    {p.obs ? ` · ${p.obs}` : ""}
                  </p>
                </div>
                <form action={removerPagamento} className="shrink-0">
                  <input type="hidden" name="pagamentoId" value={p.id} />
                  <input type="hidden" name="osId" value={os.id} />
                  <button
                    type="submit"
                    aria-label="Remover pagamento"
                    className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <FormPagamento osId={os.id} sugestaoCentavos={fin.saldoCentavos} />

        <p className="mt-3 text-xs text-slate-500">
          O custo das peças e o lucro ficam só aqui no sistema. O orçamento do cliente
          mostra apenas o preço final.
        </p>
      </section>

      <section className={CARTAO_PAD}>
        <h2 className={TITULO_SECAO}>Orçamento do cliente</h2>
        <p className="mt-1 text-sm text-slate-600">
          Desconto, validade e observações ficam no formulário acima. Total atual:{" "}
          <strong>{reais(totais.totalCentavos)}</strong>.
        </p>
        <Link
          href={`/os/${os.id}/orcamento`}
          className="mt-3 inline-block rounded-lg px-4 py-3 text-base font-bold text-white shadow-sm transition hover:brightness-110"
          style={{ backgroundColor: OFICINA.corPrimaria }}
        >
          Gerar orçamento em PDF
        </Link>
      </section>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between text-slate-700">
      <dt>{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  nota,
  cor = "text-slate-900",
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  cor?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {rotulo}
      </p>
      <p className={`mt-0.5 text-base font-black tabular-nums tracking-tight ${cor}`}>
        {valor}
      </p>
      {nota && <p className="text-[11px] text-slate-400">{nota}</p>}
    </div>
  );
}
