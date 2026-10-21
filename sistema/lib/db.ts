import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import type {
  Cliente,
  Despesa,
  ItemOS,
  OS,
  OSCompleta,
  Pagamento,
  Van,
} from "@/lib/tipos";

const ARQUIVO = "oficina/dados.json";

/** Sem token do Blob (ex.: `npm run dev` na sua máquina), grava num arquivo local. */
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const ARQUIVO_LOCAL = path.join(process.cwd(), ".dados-local.json");

/**
 * O Blob leva um instante para publicar a gravação: uma leitura logo depois de
 * gravar pode devolver a versão anterior e a OS recém-criada "sumir" (404).
 * Guardamos a última gravação em memória para as leituras seguintes.
 */
let ultimaGravacao: { banco: Banco; em: number } | null = null;
const VALIDADE_CACHE_MS = 10_000;

export type Banco = {
  clientes: Cliente[];
  vans: Van[];
  oss: OS[];
  itens: ItemOS[];
  pagamentos: Pagamento[];
  despesas: Despesa[];
  proximoNumero: number;
};

function vazio(): Banco {
  return {
    clientes: [],
    vans: [],
    oss: [],
    itens: [],
    pagamentos: [],
    despesas: [],
    proximoNumero: 1,
  };
}

/** Completa o que versões antigas do JSON não tinham, para não quebrar as telas. */
function normalizar(banco: Banco): Banco {
  for (const item of banco.itens) {
    if (typeof item.custoUnitarioCentavos !== "number") item.custoUnitarioCentavos = 0;
  }
  return banco;
}

/**
 * Lê o JSON do Blob. Se ainda não existe (oficina nova), devolve um banco vazio.
 */
export async function lerBanco(): Promise<Banco> {
  if (ultimaGravacao && Date.now() - ultimaGravacao.em < VALIDADE_CACHE_MS) {
    return structuredClone(ultimaGravacao.banco);
  }
  if (LOCAL) {
    try {
      return normalizar({
        ...vazio(),
        ...JSON.parse(await fs.readFile(ARQUIVO_LOCAL, "utf8")),
      });
    } catch {
      return vazio();
    }
  }
  try {
    const resultado = await get(ARQUIVO, { access: "private" });
    if (!resultado || resultado.statusCode !== 200) return vazio();
    const texto = await new Response(resultado.stream).text();
    if (!texto.trim()) return vazio();
    return normalizar({ ...vazio(), ...(JSON.parse(texto) as Partial<Banco>) });
  } catch {
    // primeira execução: o arquivo ainda não foi criado
    return vazio();
  }
}

export async function gravarBanco(banco: Banco): Promise<void> {
  ultimaGravacao = { banco: structuredClone(banco), em: Date.now() };
  if (LOCAL) {
    await fs.writeFile(ARQUIVO_LOCAL, JSON.stringify(banco, null, 2), "utf8");
    return;
  }
  await put(ARQUIVO, JSON.stringify(banco), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

/**
 * Lê, altera e grava. Com 1 a 3 pessoas o risco de duas gravações no mesmo
 * instante é baixo; se acontecer, a última gravação vence.
 */
export async function alterarBanco<T>(
  alteracao: (banco: Banco) => T | Promise<T>,
): Promise<T> {
  const banco = await lerBanco();
  const resultado = await alteracao(banco);
  await gravarBanco(banco);
  return resultado;
}

export function novoId(): string {
  return crypto.randomUUID();
}

/* ------------------------------- consultas ------------------------------- */

export function montarOS(banco: Banco, os: OS): OSCompleta | null {
  const van = banco.vans.find((v) => v.id === os.vanId);
  if (!van) return null;
  const cliente = banco.clientes.find((c) => c.id === van.clienteId);
  if (!cliente) return null;
  return {
    ...os,
    van: { ...van, cliente },
    itens: banco.itens
      .filter((i) => i.osId === os.id)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)),
    pagamentos: banco.pagamentos
      .filter((p) => p.osId === os.id)
      .sort((a, b) => a.data.localeCompare(b.data)),
  };
}

export async function listarOSAbertas(): Promise<OSCompleta[]> {
  const banco = await lerBanco();
  return banco.oss
    .filter((os) => os.status !== "entregue")
    .map((os) => montarOS(banco, os))
    .filter((os): os is OSCompleta => os !== null);
}

export async function buscarOS(id: string): Promise<OSCompleta | null> {
  const banco = await lerBanco();
  const os = banco.oss.find((o) => o.id === id);
  if (os) return montarOS(banco, os);

  // Pode ser uma OS recém-criada que o Blob ainda não publicou: tenta de novo.
  await new Promise((pronto) => setTimeout(pronto, 600));
  const relido = await lerBanco();
  const osRelida = relido.oss.find((o) => o.id === id);
  return osRelida ? montarOS(relido, osRelida) : null;
}

export async function buscarVanPorPlaca(
  placa: string,
): Promise<{ van: Van; cliente: Cliente; oss: OSCompleta[] } | null> {
  const banco = await lerBanco();
  const van = banco.vans.find((v) => v.placa === placa);
  if (!van) return null;
  const cliente = banco.clientes.find((c) => c.id === van.clienteId);
  if (!cliente) return null;
  const oss = banco.oss
    .filter((os) => os.vanId === van.id)
    .map((os) => montarOS(banco, os))
    .filter((os): os is OSCompleta => os !== null)
    .sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada));
  return { van, cliente, oss };
}

/** Todas as OS, inclusive as entregues. Usado pelo financeiro. */
export async function listarTodasOS(): Promise<{
  oss: OSCompleta[];
  despesas: Despesa[];
}> {
  const banco = await lerBanco();
  const oss = banco.oss
    .map((os) => montarOS(banco, os))
    .filter((os): os is OSCompleta => os !== null)
    .sort((a, b) => b.dataEntrada.localeCompare(a.dataEntrada));
  const despesas = [...banco.despesas].sort((a, b) => b.data.localeCompare(a.data));
  return { oss, despesas };
}
