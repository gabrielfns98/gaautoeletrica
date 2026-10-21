import { NextResponse } from "next/server";
import { z } from "zod";
import { buscarVanPorPlaca } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizarPlaca } from "@/lib/placa";

/** Busca a van pela placa para pré-preencher a Nova entrada. */
export async function GET(request: Request) {
  await requireUser();

  const parsed = z
    .object({ placa: z.string().min(1) })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ erro: "Placa não informada." }, { status: 400 });
  }

  const dados = await buscarVanPorPlaca(normalizarPlaca(parsed.data.placa));
  if (!dados) return NextResponse.json({ encontrada: false });

  const { van, cliente, oss } = dados;

  return NextResponse.json({
    encontrada: true,
    van: {
      id: van.id,
      placa: van.placa,
      modelo: van.modelo,
      ano: van.ano,
      obs: van.obs,
      cliente: { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone },
      ultimasOS: oss.slice(0, 3).map((os) => ({
        id: os.id,
        numero: os.numero,
        dataEntrada: os.dataEntrada,
        problemaRelatado: os.problemaRelatado,
        problemaReal: os.problemaReal,
        servicoFeito: os.servicoFeito,
      })),
    },
  });
}
