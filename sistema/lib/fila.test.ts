import { describe, expect, it } from "vitest";
import { estaAtrasada, ordenarFila, type OSFila } from "./fila";

function os(id: string, p: Partial<OSFila> = {}): OSFila {
  return {
    id,
    fixada: false,
    prioridade: "normal",
    previsaoEntrega: null,
    dataEntrada: new Date("2026-01-10T08:00:00Z"),
    ...p,
  };
}

const ids = (l: OSFila[]) => l.map((o) => o.id);

describe("ordenarFila", () => {
  it("coloca a fixada no topo, acima de urgente", () => {
    const lista = [
      os("urgente", { prioridade: "urgente" }),
      os("fixada", { fixada: true }),
    ];
    expect(ids(ordenarFila(lista))).toEqual(["fixada", "urgente"]);
  });

  it("urgente vem antes de normal", () => {
    const lista = [os("normal"), os("urgente", { prioridade: "urgente" })];
    expect(ids(ordenarFila(lista))).toEqual(["urgente", "normal"]);
  });

  it("previsão mais próxima primeiro e sem previsão vai para o fim", () => {
    const lista = [
      os("sem-previsao"),
      os("depois", { previsaoEntrega: new Date("2026-02-20") }),
      os("antes", { previsaoEntrega: new Date("2026-02-01") }),
    ];
    expect(ids(ordenarFila(lista))).toEqual(["antes", "depois", "sem-previsao"]);
  });

  it("empate em previsão desempata pela entrada mais antiga", () => {
    const mesmaPrevisao = new Date("2026-03-01");
    const lista = [
      os("nova", {
        previsaoEntrega: mesmaPrevisao,
        dataEntrada: new Date("2026-02-20"),
      }),
      os("velha", {
        previsaoEntrega: mesmaPrevisao,
        dataEntrada: new Date("2026-02-10"),
      }),
    ];
    expect(ids(ordenarFila(lista))).toEqual(["velha", "nova"]);
  });

  it("sem previsão nenhuma, ordena pela entrada mais antiga", () => {
    const lista = [
      os("b", { dataEntrada: new Date("2026-01-15") }),
      os("a", { dataEntrada: new Date("2026-01-02") }),
    ];
    expect(ids(ordenarFila(lista))).toEqual(["a", "b"]);
  });

  it("aplica os 4 critérios em conjunto", () => {
    const lista = [
      os("4-antiga", { dataEntrada: new Date("2026-01-01") }),
      os("3-com-previsao", { previsaoEntrega: new Date("2026-01-30") }),
      os("1-fixada", { fixada: true, dataEntrada: new Date("2026-05-01") }),
      os("2-urgente", { prioridade: "urgente" }),
      os("5-recente", { dataEntrada: new Date("2026-04-01") }),
    ];
    expect(ids(ordenarFila(lista))).toEqual([
      "1-fixada",
      "2-urgente",
      "3-com-previsao",
      "4-antiga",
      "5-recente",
    ]);
  });

  it("não muta a lista original", () => {
    const lista = [os("b"), os("a", { fixada: true })];
    const copia = [...lista];
    ordenarFila(lista);
    expect(lista).toEqual(copia);
  });
});

describe("estaAtrasada", () => {
  const hoje = new Date("2026-03-10T15:00:00Z");

  it("sem previsão não está atrasada", () => {
    expect(estaAtrasada(null, hoje)).toBe(false);
  });

  it("previsão de ontem está atrasada", () => {
    expect(estaAtrasada(new Date("2026-03-09T23:00:00Z"), hoje)).toBe(true);
  });

  it("previsão de hoje não está atrasada", () => {
    expect(estaAtrasada(new Date("2026-03-10T01:00:00Z"), hoje)).toBe(false);
  });

  it("previsão futura não está atrasada", () => {
    expect(estaAtrasada(new Date("2026-03-20"), hoje)).toBe(false);
  });
});
