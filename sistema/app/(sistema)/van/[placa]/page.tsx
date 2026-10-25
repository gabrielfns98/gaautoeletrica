import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarVanPorPlaca } from "@/lib/db";
import { dataBR, reais } from "@/lib/format";
import { formatarPlaca, normalizarPlaca } from "@/lib/placa";
import { numeroOrcamento } from "@/lib/oficina";
import { calcularTotais } from "@/lib/orcamento";
import { STATUS_CLASSE, STATUS_LABEL, TIPO_ITEM_LABEL } from "@/lib/status";
import { BOTAO_FANTASMA, CARTAO_PAD } from "@/lib/ui";
import FormExcluirVeiculo from "./FormExcluirVeiculo";

export const dynamic = "force-dynamic";

export default async function HistoricoVan({
  params,
}: {
  params: Promise<{ placa: string }>;
}) {
  const { placa } = await params;

  const dados = await buscarVanPorPlaca(normalizarPlaca(decodeURIComponent(placa)));

  if (!dados) notFound();

  const { van, cliente, oss } = dados;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Histórico da van
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{formatarPlaca(van.placa)}</h1>
          <p className="text-sm font-medium text-slate-700">
            {van.modelo}
            {van.ano ? ` (${van.ano})` : ""} · {cliente.nome} · {cliente.telefone}
          </p>
          {van.obs && <p className="text-xs text-slate-500">{van.obs}</p>}
        </div>
        <Link href="/" className={BOTAO_FANTASMA}>
          Painel
        </Link>
      </div>

      {oss.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
          Esta van ainda não tem OS registrada.
        </p>
      ) : (
        <ol className="space-y-3 border-l-2 border-slate-300 pl-4">
          {oss.map((os) => {
            const totais = calcularTotais(os.itens, os.descontoCentavos);
            return (
              <li key={os.id} className={`relative ${CARTAO_PAD}`}>
                <span className="absolute -left-[22px] top-5 h-3 w-3 rounded-full bg-slate-400" />
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/os/${os.id}`} className="font-bold text-slate-900 underline">
                    {numeroOrcamento(os.numero)}
                  </Link>
                  <span className="text-sm text-slate-600">{dataBR(os.dataEntrada)}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_CLASSE[os.status]}`}
                  >
                    {STATUS_LABEL[os.status]}
                  </span>
                  {os.km && (
                    <span className="text-xs text-slate-500">
                      {os.km.toLocaleString("pt-BR")} km
                    </span>
                  )}
                  {os.dataEntrega && (
                    <span className="text-xs text-slate-500">
                      entregue em {dataBR(os.dataEntrega)}
                    </span>
                  )}
                </div>

                <Campo titulo="Problema relatado" texto={os.problemaRelatado} />
                <Campo titulo="Problema real" texto={os.problemaReal} />
                <Campo titulo="Serviço feito" texto={os.servicoFeito} />

                {os.itens.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-bold uppercase text-slate-500">Peças e serviços</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                      {os.itens.map((item) => (
                        <li key={item.id}>
                          {item.quantidade} × {item.descricao}{" "}
                          <span className="text-xs text-slate-500">
                            ({TIPO_ITEM_LABEL[item.tipo]} ·{" "}
                            {reais(item.quantidade * item.valorUnitarioCentavos)})
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-sm font-semibold">
                      Total: {reais(totais.totalCentavos)}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <FormExcluirVeiculo
        vanId={van.id}
        placa={formatarPlaca(van.placa)}
        resumo={{
          os: oss.length,
          pagamentos: oss.reduce((total, os) => total + os.pagamentos.length, 0),
          recebidoCentavos: oss.reduce(
            (total, os) =>
              total + os.pagamentos.reduce((soma, p) => soma + Math.max(0, p.valorCentavos), 0),
            0,
          ),
        }}
      />
    </div>
  );
}

function Campo({ titulo, texto }: { titulo: string; texto?: string | null }) {
  if (!texto) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-bold uppercase text-slate-500">{titulo}</p>
      <p className="whitespace-pre-line text-sm text-slate-800">{texto}</p>
    </div>
  );
}
