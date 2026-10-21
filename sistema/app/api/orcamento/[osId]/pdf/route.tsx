import fs from "node:fs";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { buscarOS } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { numeroCurto } from "@/lib/oficina";
import { somarDias } from "@/lib/format";
import { OrcamentoPDF } from "@/lib/pdf/OrcamentoPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function lerLogo(): string | null {
  try {
    const arquivo = path.join(process.cwd(), "public", "logo.png");
    return `data:image/png;base64,${fs.readFileSync(arquivo).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ osId: string }> },
) {
  await requireUser();

  const { osId } = await params;

  const os = await buscarOS(osId);

  if (!os) return new Response("OS não encontrada.", { status: 404 });

  const emissao = new Date();
  const buffer = await renderToBuffer(
    OrcamentoPDF({
      numero: os.numero,
      emissao,
      validadeAte: somarDias(emissao, os.validadeDias),
      cliente: { nome: os.van.cliente.nome, telefone: os.van.cliente.telefone },
      van: {
        placa: os.van.placa,
        modelo: os.van.modelo,
        ano: os.van.ano,
        km: os.km,
      },
      problemaRelatado: os.problemaRelatado,
      problemaReal: os.problemaReal,
      observacoes: os.observacoesOrcamento,
      descontoCentavos: os.descontoCentavos,
      itens: os.itens.map((i) => ({
        tipo: i.tipo,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitarioCentavos: i.valorUnitarioCentavos,
      })),
      logoDataUri: lerLogo(),
    }),
  );

  const nome = `orcamento-${numeroCurto(os.numero)}-${os.van.placa}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
