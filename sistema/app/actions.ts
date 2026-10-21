"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/supabase-server";
import { normalizarPlaca, placaValida } from "@/lib/placa";
import { paraCentavos } from "@/lib/format";
import { OBSERVACOES_ORCAMENTO_PADRAO } from "@/lib/oficina";

export type ResultadoAction = { erro?: string };

const texto = (max = 2000) => z.string().trim().max(max);

const placaSchema = z
  .string()
  .trim()
  .transform(normalizarPlaca)
  .refine(placaValida, "Placa inválida. Use ABC1234 ou ABC1D23.");

const telefoneSchema = z
  .string()
  .trim()
  .transform((t) => t.replace(/\D/g, ""))
  .refine((t) => t.length >= 10 && t.length <= 13, "Telefone inválido (com DDD).");

const dataOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(`${v}T12:00:00`) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Data inválida.");

const inteiroOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v.replace(/\D/g, "")) : null))
  .refine((n) => n === null || (Number.isFinite(n) && n >= 0), "Número inválido.");

const statusSchema = z.enum([
  "na_fila",
  "em_servico",
  "aguardando_peca",
  "pronta",
  "entregue",
]);

/* ------------------------------ Nova entrada ------------------------------ */

const novaEntradaSchema = z.object({
  placa: placaSchema,
  modelo: texto(120).min(2, "Informe o modelo da van."),
  ano: inteiroOpcional,
  obsVan: texto().optional(),
  clienteId: z.string().trim().optional(),
  clienteNome: texto(120).optional(),
  clienteTelefone: z.string().trim().optional(),
  obsCliente: texto().optional(),
  problemaRelatado: texto().min(3, "Descreva o problema relatado."),
  km: inteiroOpcional,
  prioridade: z.enum(["normal", "urgente"]),
  previsaoEntrega: dataOpcional,
});

export async function criarEntrada(
  _anterior: ResultadoAction | null,
  formData: FormData,
): Promise<ResultadoAction> {
  await requireUser();

  const dados = novaEntradaSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = dados.data;

  let vanId: string;
  const vanExistente = await prisma.van.findUnique({ where: { placa: d.placa } });

  if (vanExistente) {
    vanId = vanExistente.id;
    await prisma.van.update({
      where: { id: vanId },
      data: { modelo: d.modelo, ano: d.ano, obs: d.obsVan || null },
    });
  } else {
    let clienteId = d.clienteId;
    if (!clienteId) {
      const cliente = z
        .object({ nome: texto(120).min(2, "Informe o nome do cliente."), telefone: telefoneSchema })
        .safeParse({ nome: d.clienteNome ?? "", telefone: d.clienteTelefone ?? "" });
      if (!cliente.success) {
        return { erro: cliente.error.issues[0]?.message ?? "Dados do cliente inválidos." };
      }
      const novo = await prisma.cliente.create({
        data: {
          nome: cliente.data.nome,
          telefone: cliente.data.telefone,
          obs: d.obsCliente || null,
        },
      });
      clienteId = novo.id;
    }
    const van = await prisma.van.create({
      data: {
        clienteId,
        placa: d.placa,
        modelo: d.modelo,
        ano: d.ano,
        obs: d.obsVan || null,
      },
    });
    vanId = van.id;
  }

  const os = await prisma.oS.create({
    data: {
      vanId,
      problemaRelatado: d.problemaRelatado,
      km: d.km,
      prioridade: d.prioridade,
      previsaoEntrega: d.previsaoEntrega,
      status: "na_fila",
      observacoesOrcamento: OBSERVACOES_ORCAMENTO_PADRAO,
    },
  });

  revalidatePath("/");
  redirect(`/os/${os.id}`);
}

/* --------------------------------- Painel --------------------------------- */

export async function mudarStatus(formData: FormData) {
  await requireUser();

  const dados = z
    .object({ osId: z.string().min(1), status: statusSchema })
    .safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  const { osId, status } = dados.data;
  await prisma.oS.update({
    where: { id: osId },
    data: {
      status,
      dataEntrega: status === "entregue" ? new Date() : null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/os/${osId}`);
}

export async function alternarFixada(formData: FormData) {
  await requireUser();

  const dados = z
    .object({ osId: z.string().min(1), fixada: z.enum(["true", "false"]) })
    .safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  await prisma.oS.update({
    where: { id: dados.data.osId },
    data: { fixada: dados.data.fixada === "true" },
  });

  revalidatePath("/");
}

/* -------------------------------- Ficha da OS ------------------------------ */

const osSchema = z.object({
  osId: z.string().min(1),
  problemaRelatado: texto().min(3, "Descreva o problema relatado."),
  problemaReal: texto().optional(),
  servicoFeito: texto().optional(),
  km: inteiroOpcional,
  prioridade: z.enum(["normal", "urgente"]),
  status: statusSchema,
  previsaoEntrega: dataOpcional,
  desconto: z.string().trim().optional(),
  validadeDias: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v.replace(/\D/g, "")) : 7))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 365, "Validade entre 1 e 365 dias."),
  observacoesOrcamento: texto(4000).optional(),
});

export async function salvarOS(
  _anterior: ResultadoAction | null,
  formData: FormData,
): Promise<ResultadoAction> {
  await requireUser();

  const dados = osSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = dados.data;

  await prisma.oS.update({
    where: { id: d.osId },
    data: {
      problemaRelatado: d.problemaRelatado,
      problemaReal: d.problemaReal || null,
      servicoFeito: d.servicoFeito || null,
      km: d.km,
      prioridade: d.prioridade,
      status: d.status,
      previsaoEntrega: d.previsaoEntrega,
      dataEntrega: d.status === "entregue" ? new Date() : null,
      descontoCentavos: paraCentavos(d.desconto ?? "0"),
      validadeDias: d.validadeDias,
      observacoesOrcamento: d.observacoesOrcamento || null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/os/${d.osId}`);
  return {};
}

const itemSchema = z.object({
  osId: z.string().min(1),
  tipo: z.enum(["peca_comprada", "peca_reparada", "mao_de_obra"]),
  descricao: texto(300).min(2, "Descreva o item."),
  quantidade: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v.replace(",", ".")) : 1))
    .refine((n) => Number.isFinite(n) && n >= 1, "Quantidade inválida.")
    .transform((n) => Math.round(n)),
  valorUnitario: z.string().trim().min(1, "Informe o valor unitário."),
});

export async function adicionarItem(
  _anterior: ResultadoAction | null,
  formData: FormData,
): Promise<ResultadoAction> {
  await requireUser();

  const dados = itemSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Item inválido." };
  }
  const d = dados.data;

  await prisma.itemOS.create({
    data: {
      osId: d.osId,
      tipo: d.tipo,
      descricao: d.descricao,
      quantidade: d.quantidade,
      valorUnitarioCentavos: paraCentavos(d.valorUnitario),
    },
  });

  revalidatePath(`/os/${d.osId}`);
  return {};
}

export async function removerItem(formData: FormData) {
  await requireUser();

  const dados = z
    .object({ itemId: z.string().min(1), osId: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  await prisma.itemOS.delete({ where: { id: dados.data.itemId } });
  revalidatePath(`/os/${dados.data.osId}`);
}
