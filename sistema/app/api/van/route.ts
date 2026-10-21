import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/supabase-server";
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

  const van = await prisma.van.findUnique({
    where: { placa: normalizarPlaca(parsed.data.placa) },
    include: {
      cliente: true,
      oss: {
        orderBy: { dataEntrada: "desc" },
        take: 3,
        select: {
          id: true,
          numero: true,
          dataEntrada: true,
          problemaRelatado: true,
          problemaReal: true,
          servicoFeito: true,
        },
      },
    },
  });

  if (!van) return NextResponse.json({ encontrada: false });

  return NextResponse.json({
    encontrada: true,
    van: {
      id: van.id,
      placa: van.placa,
      modelo: van.modelo,
      ano: van.ano,
      obs: van.obs,
      cliente: {
        id: van.cliente.id,
        nome: van.cliente.nome,
        telefone: van.cliente.telefone,
      },
      ultimasOS: van.oss,
    },
  });
}
