import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const COOKIE_SESSAO = "oficina_sessao";
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function segredo(): string {
  const s = process.env.SESSAO_SECRET ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!s) throw new Error("SESSAO_SECRET não configurado.");
  return s;
}

/** HMAC com Web Crypto: funciona tanto no middleware quanto no servidor. */
async function assinar(valor: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign(
    "HMAC",
    chave,
    new TextEncoder().encode(valor),
  );
  return Array.from(new Uint8Array(assinatura))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function criarTokenSessao(): Promise<string> {
  const expiraEm = String(Date.now() + DURACAO_MS);
  return `${expiraEm}.${await assinar(expiraEm)}`;
}

export async function tokenValido(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expiraEm, assinatura] = token.split(".");
  if (!expiraEm || !assinatura) return false;
  if (Number(expiraEm) < Date.now()) return false;
  const esperada = await assinar(expiraEm);
  // comparação de tempo constante
  if (esperada.length !== assinatura.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperada.length; i++) {
    diferenca |= esperada.charCodeAt(i) ^ assinatura.charCodeAt(i);
  }
  return diferenca === 0;
}

export function senhaCorreta(senha: string): boolean {
  const esperada = process.env.OFICINA_SENHA;
  if (!esperada) return false;
  if (senha.length !== esperada.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperada.length; i++) {
    diferenca |= esperada.charCodeAt(i) ^ senha.charCodeAt(i);
  }
  return diferenca === 0;
}

/** Garante login. Usar em toda página, server action e route handler. */
export async function requireUser(): Promise<void> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!(await tokenValido(token))) redirect("/login");
}
