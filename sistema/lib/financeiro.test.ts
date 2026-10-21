import { describe, expect, it } from "vitest";
import {
  custoDasPecas,
  financeiroDaOS,
  mesDe,
  resumoDoMes,
  totalPago,
} from "@/lib/financeiro";

const peca = (valor: number, custo: number, qtd = 1) => ({
  tipo: "peca_comprada" as const,
  quantidade: qtd,
  valorUnitarioCentavos: valor,
  custoUnitarioCentavos: custo,
});
const mao = (valor: number) => ({
  tipo: "mao_de_obra" as const,
  quantidade: 1,
  valorUnitarioCentavos: valor,
  custoUnitarioCentavos: 0,
});

describe("custoDasPecas", () => {
  it("multiplica pela quantidade", () => {
    expect(custoDasPecas([peca(10000, 6000, 3)])).toBe(18000);
  });

  it("trata item antigo sem custo como zero", () => {
    expect(custoDasPecas([{ quantidade: 2, custoUnitarioCentavos: undefined as never }])).toBe(0);
  });
});

describe("totalPago", () => {
  it("soma os pagamentos e ignora valor negativo", () => {
    expect(totalPago([{ valorCentavos: 5000 }, { valorCentavos: -100 }])).toBe(5000);
  });
});

describe("financeiroDaOS", () => {
  const os = {
    itens: [peca(20000, 12000), mao(15000)],
    pagamentos: [{ valorCentavos: 10000 }],
    descontoCentavos: 5000,
  };

  it("usa o total já com desconto", () => {
    expect(financeiroDaOS(os).totalCentavos).toBe(30000);
  });

  it("calcula saldo e lucro", () => {
    const f = financeiroDaOS(os);
    expect(f.pagoCentavos).toBe(10000);
    expect(f.saldoCentavos).toBe(20000);
    expect(f.custoCentavos).toBe(12000);
    expect(f.lucroCentavos).toBe(18000);
    expect(f.quitada).toBe(false);
  });

  it("não deixa saldo negativo quando o cliente paga a mais", () => {
    const f = financeiroDaOS({ ...os, pagamentos: [{ valorCentavos: 99999 }] });
    expect(f.saldoCentavos).toBe(0);
    expect(f.quitada).toBe(true);
  });

  it("OS sem item nem pagamento não fica quitada", () => {
    const f = financeiroDaOS({ itens: [], pagamentos: [], descontoCentavos: 0 });
    expect(f.totalCentavos).toBe(0);
    expect(f.quitada).toBe(false);
  });
});

describe("mesDe", () => {
  it("usa o fuso de São Paulo", () => {
    // 1º/11 às 00:30 UTC ainda é 31/10 no Brasil
    expect(mesDe("2026-11-01T00:30:00.000Z")).toBe("2026-10");
    expect(mesDe("2026-11-01T12:00:00.000Z")).toBe("2026-11");
  });
});

describe("resumoDoMes", () => {
  const entregueEmOutubro = {
    status: "entregue",
    dataEntrega: "2026-10-10T15:00:00.000Z",
    descontoCentavos: 0,
    itens: [peca(30000, 18000), mao(20000)],
    pagamentos: [{ valorCentavos: 50000, data: "2026-10-10T15:00:00.000Z" }],
  };
  const abertaComSaldo = {
    status: "em_servico",
    dataEntrega: null,
    descontoCentavos: 0,
    itens: [mao(40000)],
    pagamentos: [{ valorCentavos: 10000, data: "2026-10-20T15:00:00.000Z" }],
  };
  const entregueEmSetembro = {
    status: "entregue",
    dataEntrega: "2026-09-02T15:00:00.000Z",
    descontoCentavos: 0,
    itens: [mao(10000)],
    pagamentos: [{ valorCentavos: 10000, data: "2026-09-02T15:00:00.000Z" }],
  };
  const despesas = [
    { data: "2026-10-05T12:00:00.000Z", valorCentavos: 9000 },
    { data: "2026-09-05T12:00:00.000Z", valorCentavos: 100000 },
  ];

  const r = resumoDoMes(
    [entregueEmOutubro, abertaComSaldo, entregueEmSetembro],
    despesas,
    "2026-10",
  );

  it("fatura só o que foi entregue no mês", () => {
    expect(r.faturadoCentavos).toBe(50000);
    expect(r.osEntregues).toBe(1);
  });

  it("conta custo e despesas do mês", () => {
    expect(r.custoPecasCentavos).toBe(18000);
    expect(r.despesasCentavos).toBe(9000);
    expect(r.lucroCentavos).toBe(50000 - 18000 - 9000);
  });

  it("soma o recebido do mês, de qualquer OS", () => {
    expect(r.recebidoCentavos).toBe(60000);
  });

  it("acumula o a receber de todos os meses", () => {
    expect(r.aReceberCentavos).toBe(30000);
  });

  it("mês sem movimento zera tudo", () => {
    const vazio = resumoDoMes([entregueEmOutubro], despesas, "2026-01");
    expect(vazio.faturadoCentavos).toBe(0);
    expect(vazio.recebidoCentavos).toBe(0);
    expect(vazio.lucroCentavos).toBe(0);
  });
});
