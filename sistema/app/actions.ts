"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { alterarBanco, novoId } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizarPlaca, placaValida } from "@/lib/placa";
import { paraCentavos } from "@/lib/format";
import { OBSERVACOES_ORCAMENTO_PADRAO } from "@/lib/oficina";
import { bancoDemo } from "@/lib/demo";

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
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Data inválida.")
  .transform((d) => (d ? d.toISOString() : null));

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

  const resultado = await alterarBanco((banco): ResultadoAction & { osId?: string } => {
    const agora = new Date().toISOString();
    let van = banco.vans.find((v) => v.placa === d.placa);

    if (van) {
      van.modelo = d.modelo;
      van.ano = d.ano;
      van.obs = d.obsVan || null;
    } else {
      let clienteId = d.clienteId;
      if (!clienteId || !banco.clientes.some((c) => c.id === clienteId)) {
        const cliente = z
          .object({
            nome: texto(120).min(2, "Informe o nome do cliente."),
            telefone: telefoneSchema,
          })
          .safeParse({ nome: d.clienteNome ?? "", telefone: d.clienteTelefone ?? "" });
        if (!cliente.success) {
          return { erro: cliente.error.issues[0]?.message ?? "Dados do cliente inválidos." };
        }
        clienteId = novoId();
        banco.clientes.push({
          id: clienteId,
          nome: cliente.data.nome,
          telefone: cliente.data.telefone,
          obs: d.obsCliente || null,
          criadoEm: agora,
        });
      }
      van = {
        id: novoId(),
        clienteId,
        placa: d.placa,
        modelo: d.modelo,
        ano: d.ano,
        obs: d.obsVan || null,
        criadoEm: agora,
      };
      banco.vans.push(van);
    }

    const osId = novoId();
    banco.oss.push({
      id: osId,
      numero: banco.proximoNumero,
      vanId: van.id,
      dataEntrada: agora,
      km: d.km,
      prioridade: d.prioridade,
      status: "na_fila",
      fixada: false,
      previsaoEntrega: d.previsaoEntrega,
      dataEntrega: null,
      problemaRelatado: d.problemaRelatado,
      problemaReal: null,
      servicoFeito: null,
      descontoCentavos: 0,
      validadeDias: 7,
      observacoesOrcamento: OBSERVACOES_ORCAMENTO_PADRAO,
    });
    banco.proximoNumero += 1;

    return { osId };
  });

  if (resultado.erro) return { erro: resultado.erro };

  revalidatePath("/");
  redirect(`/os/${resultado.osId}`);
}

/* --------------------------------- Painel --------------------------------- */

export async function mudarStatus(formData: FormData) {
  await requireUser();

  const dados = z
    .object({ osId: z.string().min(1), status: statusSchema })
    .safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  const { osId, status } = dados.data;
  await alterarBanco((banco) => {
    const os = banco.oss.find((o) => o.id === osId);
    if (!os) return;
    os.status = status;
    os.dataEntrega = status === "entregue" ? new Date().toISOString() : null;
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

  await alterarBanco((banco) => {
    const os = banco.oss.find((o) => o.id === dados.data.osId);
    if (os) os.fixada = dados.data.fixada === "true";
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

  await alterarBanco((banco) => {
    const os = banco.oss.find((o) => o.id === d.osId);
    if (!os) return;
    os.problemaRelatado = d.problemaRelatado;
    os.problemaReal = d.problemaReal || null;
    os.servicoFeito = d.servicoFeito || null;
    os.km = d.km;
    os.prioridade = d.prioridade;
    os.status = d.status;
    os.previsaoEntrega = d.previsaoEntrega;
    os.dataEntrega = d.status === "entregue" ? new Date().toISOString() : null;
    os.descontoCentavos = paraCentavos(d.desconto ?? "0");
    os.validadeDias = d.validadeDias;
    os.observacoesOrcamento = d.observacoesOrcamento || null;
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
  custoUnitario: z.string().trim().optional(),
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

  await alterarBanco((banco) => {
    banco.itens.push({
      id: novoId(),
      osId: d.osId,
      tipo: d.tipo,
      descricao: d.descricao,
      quantidade: d.quantidade,
      valorUnitarioCentavos: paraCentavos(d.valorUnitario),
      custoUnitarioCentavos: paraCentavos(d.custoUnitario ?? "0"),
      criadoEm: new Date().toISOString(),
    });
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

  await alterarBanco((banco) => {
    banco.itens = banco.itens.filter((i) => i.id !== dados.data.itemId);
  });

  revalidatePath(`/os/${dados.data.osId}`);
}

/* -------------------------------- Financeiro ------------------------------- */

const dataObrigatoria = z
  .string()
  .trim()
  .min(1, "Informe a data.")
  .transform((v) => new Date(`${v}T12:00:00`))
  .refine((d) => !Number.isNaN(d.getTime()), "Data inválida.")
  .transform((d) => d.toISOString());

const valorSchema = z
  .string()
  .trim()
  .min(1, "Informe o valor.")
  .transform(paraCentavos)
  .refine((c) => c > 0, "O valor precisa ser maior que zero.");

const pagamentoSchema = z.object({
  osId: z.string().min(1),
  data: dataObrigatoria,
  valor: valorSchema,
  forma: z.enum([
    "dinheiro",
    "pix",
    "cartao_debito",
    "cartao_credito",
    "transferencia",
    "boleto",
  ]),
  obs: texto(300).optional(),
});

export async function registrarPagamento(
  _anterior: ResultadoAction | null,
  formData: FormData,
): Promise<ResultadoAction> {
  await requireUser();

  const dados = pagamentoSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Pagamento inválido." };
  }
  const d = dados.data;

  await alterarBanco((banco) => {
    if (!banco.oss.some((o) => o.id === d.osId)) return;
    banco.pagamentos.push({
      id: novoId(),
      osId: d.osId,
      data: d.data,
      valorCentavos: d.valor,
      forma: d.forma,
      obs: d.obs || null,
      criadoEm: new Date().toISOString(),
    });
  });

  revalidatePath(`/os/${d.osId}`);
  revalidatePath("/financeiro");
  return {};
}

export async function removerPagamento(formData: FormData) {
  await requireUser();

  const dados = z
    .object({ pagamentoId: z.string().min(1), osId: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  await alterarBanco((banco) => {
    banco.pagamentos = banco.pagamentos.filter((p) => p.id !== dados.data.pagamentoId);
  });

  revalidatePath(`/os/${dados.data.osId}`);
  revalidatePath("/financeiro");
}

const despesaSchema = z.object({
  data: dataObrigatoria,
  descricao: texto(200).min(2, "Descreva a despesa."),
  categoria: z.enum([
    "aluguel",
    "salarios",
    "ferramentas",
    "energia_agua",
    "impostos",
    "outros",
  ]),
  valor: valorSchema,
});

export async function adicionarDespesa(
  _anterior: ResultadoAction | null,
  formData: FormData,
): Promise<ResultadoAction> {
  await requireUser();

  const dados = despesaSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Despesa inválida." };
  }
  const d = dados.data;

  await alterarBanco((banco) => {
    banco.despesas.push({
      id: novoId(),
      data: d.data,
      descricao: d.descricao,
      categoria: d.categoria,
      valorCentavos: d.valor,
      criadoEm: new Date().toISOString(),
    });
  });

  revalidatePath("/financeiro");
  return {};
}

export async function removerDespesa(formData: FormData) {
  await requireUser();

  const dados = z
    .object({ despesaId: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!dados.success) return;

  await alterarBanco((banco) => {
    banco.despesas = banco.despesas.filter((d) => d.id !== dados.data.despesaId);
  });

  revalidatePath("/financeiro");
}

/* ----------------------------- Dados de exemplo ---------------------------- */

/** Só funciona com o sistema vazio: nunca apaga dado de verdade. */
export async function preencherComExemplo(): Promise<void> {
  await requireUser();

  await alterarBanco((banco) => {
    if (banco.oss.length > 0 || banco.vans.length > 0) return;
    Object.assign(banco, bancoDemo());
  });

  revalidatePath("/");
  revalidatePath("/financeiro");
}

function esvaziar(banco: {
  clientes: unknown[];
  vans: unknown[];
  oss: unknown[];
  itens: unknown[];
  pagamentos: unknown[];
  despesas: unknown[];
  proximoNumero: number;
}) {
  banco.clientes = [];
  banco.vans = [];
  banco.oss = [];
  banco.itens = [];
  banco.pagamentos = [];
  banco.despesas = [];
  banco.proximoNumero = 1;
}

/** Só funciona se TODAS as OS forem de exemplo. */
export async function limparExemplo(): Promise<void> {
  await requireUser();

  await alterarBanco((banco) => {
    if (banco.oss.length === 0 || !banco.oss.every((os) => os.demo)) return;
    esvaziar(banco);
  });

  revalidatePath("/");
  revalidatePath("/financeiro");
}

/** Apaga TUDO, inclusive dado real. Exige a confirmação digitada. */
const CONFIRMACAO_ZERAR = "APAGAR TUDO";

export async function zerarSistema(
  _anterior: ResultadoAction | null,
  formData: FormData,
): Promise<ResultadoAction> {
  await requireUser();

  const dados = z
    .object({ confirmacao: z.string() })
    .safeParse(Object.fromEntries(formData));

  if (
    !dados.success ||
    dados.data.confirmacao.trim().toUpperCase() !== CONFIRMACAO_ZERAR
  ) {
    return { erro: `Para confirmar, digite ${CONFIRMACAO_ZERAR} exatamente assim.` };
  }

  await alterarBanco((banco) => esvaziar(banco));

  revalidatePath("/");
  revalidatePath("/financeiro");
  return {};
}
