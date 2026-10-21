import { describe, expect, it } from "vitest";
import { calcularTotais, subtotalItem } from "./orcamento";

describe("subtotalItem", () => {
  it("multiplica quantidade por valor unitário", () => {
    expect(
      subtotalItem({ tipo: "peca_comprada", quantidade: 3, valorUnitarioCentavos: 12_550 }),
    ).toBe(37_650);
  });

  it("quantidade negativa não gera valor negativo", () => {
    expect(
      subtotalItem({ tipo: "peca_comprada", quantidade: -2, valorUnitarioCentavos: 1_000 }),
    ).toBe(0);
  });
});

describe("calcularTotais", () => {
  const itens = [
    { tipo: "peca_comprada" as const, quantidade: 2, valorUnitarioCentavos: 15_000 },
    { tipo: "peca_reparada" as const, quantidade: 1, valorUnitarioCentavos: 8_000 },
    { tipo: "mao_de_obra" as const, quantidade: 1, valorUnitarioCentavos: 25_000 },
  ];

  it("soma peças compradas e reparadas juntas", () => {
    expect(calcularTotais(itens).pecasCentavos).toBe(38_000);
  });

  it("separa mão de obra", () => {
    expect(calcularTotais(itens).maoDeObraCentavos).toBe(25_000);
  });

  it("subtotal é peças + mão de obra", () => {
    expect(calcularTotais(itens).subtotalCentavos).toBe(63_000);
  });

  it("aplica o desconto no total", () => {
    const t = calcularTotais(itens, 3_000);
    expect(t.descontoCentavos).toBe(3_000);
    expect(t.totalCentavos).toBe(60_000);
  });

  it("desconto maior que o subtotal zera o total, nunca fica negativo", () => {
    const t = calcularTotais(itens, 999_999);
    expect(t.descontoCentavos).toBe(63_000);
    expect(t.totalCentavos).toBe(0);
  });

  it("desconto negativo é ignorado", () => {
    expect(calcularTotais(itens, -500).totalCentavos).toBe(63_000);
  });

  it("lista vazia dá tudo zero", () => {
    expect(calcularTotais([], 1_000)).toEqual({
      pecasCentavos: 0,
      maoDeObraCentavos: 0,
      subtotalCentavos: 0,
      descontoCentavos: 0,
      totalCentavos: 0,
    });
  });
});
