import Link from "next/link";
import { notFound } from "next/navigation";
import { buscarOS } from "@/lib/db";
import { reais, dataBR, somarDias } from "@/lib/format";
import { formatarPlaca } from "@/lib/placa";
import { numeroCurto } from "@/lib/oficina";
import { calcularTotais } from "@/lib/orcamento";

export const dynamic = "force-dynamic";

export default async function TelaOrcamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const os = await buscarOS(id);

  if (!os) notFound();

  const totais = calcularTotais(os.itens, os.descontoCentavos);
  const validadeAte = somarDias(new Date(), os.validadeDias);
  const numero = numeroCurto(os.numero);
  const urlPdf = `/api/orcamento/${os.id}/pdf`;

  const mensagem =
    `Olá, ${os.van.cliente.nome}! Segue o orçamento nº ${numero} da sua van ` +
    `${os.van.modelo} placa ${formatarPlaca(os.van.placa)}, no valor de ` +
    `${reais(totais.totalCentavos)}. Validade: ${dataBR(validadeAte)}.`;

  const whatsapp = `https://wa.me/${os.van.cliente.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Orçamento nº {numero}</h1>
        <p className="text-sm text-slate-600">
          {formatarPlaca(os.van.placa)} · {os.van.cliente.nome} · Total{" "}
          <strong>{reais(totais.totalCentavos)}</strong> · válido até {dataBR(validadeAte)}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={urlPdf}
          download={`orcamento-${numero}-${os.van.placa}.pdf`}
          className="rounded-lg bg-blue-700 px-4 py-3 text-center text-base font-bold text-white"
        >
          Baixar PDF
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-green-600 px-4 py-3 text-center text-base font-bold text-white"
        >
          Enviar por WhatsApp
        </a>
        <Link
          href={`/os/${os.id}`}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-base font-semibold text-slate-700"
        >
          Voltar
        </Link>
      </div>

      <p className="text-xs text-slate-500">
        O WhatsApp abre com a mensagem pronta. Baixe o PDF e anexe na conversa.
      </p>

      <iframe
        src={urlPdf}
        title={`Orçamento ${numero}`}
        className="h-[70vh] w-full rounded-lg border border-slate-300 bg-white"
      />
    </div>
  );
}
