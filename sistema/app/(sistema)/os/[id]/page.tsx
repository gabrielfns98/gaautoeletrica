import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarOS } from "@/lib/db";
import { reais, dataBR, diasNaOficina } from "@/lib/format";
import { formatarPlaca } from "@/lib/placa";
import { numeroOrcamento } from "@/lib/oficina";
import { calcularTotais } from "@/lib/orcamento";
import { TIPO_ITEM_LABEL } from "@/lib/status";
import { removerItem } from "@/app/actions";
import FormOS from "./FormOS";
import FormItem from "./FormItem";

export const dynamic = "force-dynamic";

export default async function FichaOS({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const os = await buscarOS(id);

  if (!os) notFound();

  const totais = calcularTotais(os.itens, os.descontoCentavos);
  const dias = diasNaOficina(new Date(os.dataEntrada));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">
            {numeroOrcamento(os.numero)} · {formatarPlaca(os.van.placa)}
          </h1>
          <p className="text-sm text-slate-600">
            {os.van.modelo}
            {os.van.ano ? ` (${os.van.ano})` : ""} · {os.van.cliente.nome} ·{" "}
            {os.van.cliente.telefone}
          </p>
          <p className="text-xs text-slate-500">
            Entrada em {dataBR(os.dataEntrada)} · {dias} {dias === 1 ? "dia" : "dias"} na oficina
            {os.km ? ` · ${os.km.toLocaleString("pt-BR")} km` : ""}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href={`/van/${os.van.placa}`} className="text-blue-700 underline">
            histórico da van
          </Link>
          <Link href="/" className="text-blue-700 underline">
            painel
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

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Itens</h2>

        {os.itens.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum item lançado.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {os.itens.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{item.descricao}</p>
                  <p className="text-xs text-slate-500">
                    {TIPO_ITEM_LABEL[item.tipo]} · {item.quantidade} ×{" "}
                    {reais(item.valorUnitarioCentavos)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {reais(item.quantidade * item.valorUnitarioCentavos)}
                </p>
                <form action={removerItem} className="shrink-0">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="osId" value={os.id} />
                  <button
                    type="submit"
                    aria-label={`Remover ${item.descricao}`}
                    className="rounded px-2 py-1 text-sm font-bold text-red-600 hover:bg-red-50"
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
            <dt>TOTAL</dt>
            <dd>{reais(totais.totalCentavos)}</dd>
          </div>
        </dl>

        <FormItem osId={os.id} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Orçamento</h2>
        <p className="mt-1 text-sm text-slate-600">
          Desconto, validade e observações ficam no formulário acima. Total atual:{" "}
          <strong>{reais(totais.totalCentavos)}</strong>.
        </p>
        <Link
          href={`/os/${os.id}/orcamento`}
          className="mt-3 inline-block rounded-lg bg-blue-700 px-4 py-3 text-base font-bold text-white"
        >
          Gerar orçamento
        </Link>
      </section>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between text-slate-700">
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
