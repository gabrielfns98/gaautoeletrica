export function reais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** "1234,50" | "1234.50" | "R$ 1.234,50" -> 123450 */
export function paraCentavos(valor: string): number {
  const limpo = valor.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "");
  const normalizado = limpo.replace(",", ".");
  const n = Number(normalizado);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function dataBR(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const data = typeof d === "string" ? new Date(d) : d;
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function somarDias(d: Date, dias: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

/** Dias corridos entre a entrada e hoje (mínimo 0). */
export function diasNaOficina(dataEntrada: Date, agora: Date = new Date()): number {
  const ms = agora.getTime() - new Date(dataEntrada).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function resumir(texto: string | null | undefined, max = 70): string {
  if (!texto) return "—";
  const t = texto.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}
