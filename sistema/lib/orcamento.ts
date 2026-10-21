import type { TipoItem } from "@/lib/tipos";

export type ItemCalculo = {
  tipo: TipoItem;
  quantidade: number;
  valorUnitarioCentavos: number;
};

export type TotaisOrcamento = {
  pecasCentavos: number;
  maoDeObraCentavos: number;
  subtotalCentavos: number;
  descontoCentavos: number;
  totalCentavos: number;
};

export function subtotalItem(item: ItemCalculo): number {
  return Math.max(0, item.quantidade) * item.valorUnitarioCentavos;
}

/**
 * Peças compradas e reparadas somam juntas em "Peças".
 * O desconto nunca deixa o total negativo.
 */
export function calcularTotais(
  itens: ItemCalculo[],
  descontoCentavos = 0,
): TotaisOrcamento {
  let pecas = 0;
  let mao = 0;

  for (const item of itens) {
    const sub = subtotalItem(item);
    if (item.tipo === "mao_de_obra") mao += sub;
    else pecas += sub;
  }

  const subtotal = pecas + mao;
  const desconto = Math.min(Math.max(0, descontoCentavos), subtotal);

  return {
    pecasCentavos: pecas,
    maoDeObraCentavos: mao,
    subtotalCentavos: subtotal,
    descontoCentavos: desconto,
    totalCentavos: subtotal - desconto,
  };
}
