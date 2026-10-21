import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import type { Cliente, ItemOS, OS, OSCompleta, Van } from "@/lib/tipos";

const ARQUIVO = "oficina/dados.json";

/** Sem token do Blob (ex.: `npm run dev` na sua máquina), grava num arquivo local. */
const LOCAL = !process.env.BLOB_READ_WRITE_TOKEN;
const ARQUIVO_LOCAL = path.join(process.cwd(), ".dados-local.json");

export type Banco = {
  clientes: Cliente[];
  vans: Van[];
  oss: OS[];
  itens: ItemOS[];
  proximoNumero: number;
};

function vazio(): Banco {
  return { clientes: [], vans: [], oss: [], itens: [], proximoNumero: 1 };
}

/**
 * Lê o JSON do Blob. Se ainda não existe (oficina nova), devolve um banco vazio.
 */
export async function lerBanco(): Promise<Banco> {
  if (LOCAL) {
    try {
      return { ...vazio(), ...JSON.parse(await fs.readFile(ARQUIVO_LOCAL, "utf8")) };
    } catch {
      return vazio();
    }
  }
  try {
    const resultado = await get(ARQUIVO, { access: "private" });
    if (!resultado || resultado.statusCode !== 200) return vazio();
    const texto = await new Response(resultado.stream).text();
    if (!texto.trim()) return vazio();
    return { ...vazio(), ...(JSON.parse(texto) as Partial<Banco>) };
  } catch {
    // primeira execução: o arquivo ainda não foi criado
    return vazio();
  }
}

export async function gravarBanco(banco: Banco): Promise<void> {
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
  return os ? montarOS(banco, os) : null;
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
