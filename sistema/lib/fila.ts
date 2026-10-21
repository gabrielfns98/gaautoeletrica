/**
 * Ordenação da fila de trabalho (função pura, testada em lib/fila.test.ts).
 *
 * 1. fixada = true vem primeiro
 * 2. prioridade "urgente" antes de "normal"
 * 3. previsaoEntrega mais próxima primeiro (sem previsão vem depois)
 * 4. dataEntrada mais antiga primeiro
 */
export type OSFila = {
  id: string;
  fixada: boolean;
  prioridade: "normal" | "urgente";
  previsaoEntrega: Date | null;
  dataEntrada: Date;
};

export function compararFila(a: OSFila, b: OSFila): number {
  if (a.fixada !== b.fixada) return a.fixada ? -1 : 1;

  const urgenteA = a.prioridade === "urgente";
  const urgenteB = b.prioridade === "urgente";
  if (urgenteA !== urgenteB) return urgenteA ? -1 : 1;

  const prevA = a.previsaoEntrega ? new Date(a.previsaoEntrega).getTime() : null;
  const prevB = b.previsaoEntrega ? new Date(b.previsaoEntrega).getTime() : null;
  if (prevA !== null && prevB === null) return -1;
  if (prevA === null && prevB !== null) return 1;
  if (prevA !== null && prevB !== null && prevA !== prevB) return prevA - prevB;

  return new Date(a.dataEntrada).getTime() - new Date(b.dataEntrada).getTime();
}

/** Devolve uma nova lista ordenada (não muta a original). */
export function ordenarFila<T extends OSFila>(oss: T[]): T[] {
  return [...oss].sort(compararFila);
}

/** Previsão no passado (comparando só a data, sem hora). */
export function estaAtrasada(
  previsaoEntrega: Date | null,
  hoje: Date = new Date(),
): boolean {
  if (!previsaoEntrega) return false;
  const prev = new Date(previsaoEntrega);
  const limite = new Date(hoje);
  prev.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);
  return prev.getTime() < limite.getTime();
}
