import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dataBR, reais } from "@/lib/format";
import { formatarPlaca, normalizarPlaca } from "@/lib/placa";
import { numeroOrcamento } from "@/lib/oficina";
import { calcularTotais } from "@/lib/orcamento";
import { STATUS_CLASSE, STATUS_LABEL, TIPO_ITEM_LABEL } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function HistoricoVan({
  params,
}: {
  params: Promise<{ placa: string }>;
}) {
  const { placa } = await params;

  const van = await prisma.van.findUnique({
    where: { placa: normalizarPlaca(decodeURIComponent(placa)) },
    include: {
      cliente: true,
      oss: {
        orderBy: { dataEntrada: "desc" },
        include: { itens: { orderBy: { criadoEm: "asc" } } },
      },
    },
  });

  if (!van) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Histórico — {formatarPlaca(van.placa)}</h1>
          <p className="text-sm text-slate-600">
            {van.modelo}
            {van.ano ? ` (${van.ano})` : ""} · {van.cliente.nome} · {van.cliente.telefone}
          </p>
          {van.obs && <p className="text-xs text-slate-500">{van.obs}</p>}
        </div>
        <Link href="/" className="text-sm text-blue-700 underline">
          painel
        </Link>
      </div>

      {van.oss.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
          Esta van ainda não tem OS registrada.
        </p>
      ) : (
        <ol className="space-y-3 border-l-2 border-slate-300 pl-4">
          {van.oss.map((os) => {
            const totais = calcularTotais(os.itens, os.descontoCentavos);
            return (
              <li key={os.id} className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <span className="absolute -left-[22px] top-5 h-3 w-3 rounded-full bg-slate-400" />
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/os/${os.id}`} className="font-bold text-blue-700 underline">
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
