import { calcularTotais } from "@/lib/orcamento";
import type {
  CategoriaDespesa,
  Despesa,
  FormaPagamento,
  ItemOS,
  Pagamento,
} from "@/lib/tipos";

export const FORMA_LABEL: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_debito: "Cartão de débito",
  cartao_credito: "Cartão de crédito",
  transferencia: "Transferência",
  boleto: "Boleto",
};

export const CATEGORIA_LABEL: Record<CategoriaDespesa, string> = {
  aluguel: "Aluguel",
  salarios: "Salários",
  ferramentas: "Ferramentas",
  energia_agua: "Energia / água",
  impostos: "Impostos",
  outros: "Outros",
};

/** O que a oficina gastou nas peças desta OS (nunca aparece no orçamento). */
export function custoDasPecas(itens: Pick<ItemOS, "quantidade" | "custoUnitarioCentavos">[]) {
  return itens.reduce(
    (soma, i) => soma + Math.max(0, i.quantidade) * Math.max(0, i.custoUnitarioCentavos ?? 0),
    0,
  );
}

export function totalPago(pagamentos: Pick<Pagamento, "valorCentavos">[]) {
  return pagamentos.reduce((soma, p) => soma + Math.max(0, p.valorCentavos), 0);
}

export type FinanceiroOS = {
  totalCentavos: number;
  pagoCentavos: number;
  /** Nunca negativo: pagamento a mais não vira saldo negativo. */
  saldoCentavos: number;
  custoCentavos: number;
  /** Total cobrado menos o custo das peças. */
  lucroCentavos: number;
  quitada: boolean;
};

export function financeiroDaOS(os: {
  itens: Pick<ItemOS, "tipo" | "quantidade" | "valorUnitarioCentavos" | "custoUnitarioCentavos">[];
  pagamentos: Pick<Pagamento, "valorCentavos">[];
  descontoCentavos: number;
}): FinanceiroOS {
  const total = calcularTotais(os.itens, os.descontoCentavos).totalCentavos;
  const pago = totalPago(os.pagamentos);
  const custo = custoDasPecas(os.itens);
  return {
    totalCentavos: total,
    pagoCentavos: pago,
    saldoCentavos: Math.max(0, total - pago),
    custoCentavos: custo,
    lucroCentavos: total - custo,
    quitada: total > 0 && pago >= total,
  };
}

/** "2026-10" do jeito que o <input type="month"> manda. */
export function mesDe(data: string | Date): string {
  const d = typeof data === "string" ? new Date(data) : data;
  const fuso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(d);
  return fuso.slice(0, 7);
}

export function mesAtual(agora: Date = new Date()): string {
  return mesDe(agora);
}

export function nomeDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  if (!ano || !m) return mes;
  const nome = new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export type ResumoMes = {
  mes: string;
  /** Total das OS entregues no mês. */
  faturadoCentavos: number;
  /** Custo das peças dessas OS entregues. */
  custoPecasCentavos: number;
  /** Despesas lançadas no mês. */
  despesasCentavos: number;
  /** Faturado − custo das peças − despesas. */
  lucroCentavos: number;
  /** Pagamentos recebidos no mês, de qualquer OS. */
  recebidoCentavos: number;
  /** Saldo em aberto de todas as OS, de qualquer mês. */
  aReceberCentavos: number;
  osEntregues: number;
};

type OSResumo = {
  status: string;
  dataEntrega: string | null;
  descontoCentavos: number;
  itens: Pick<ItemOS, "tipo" | "quantidade" | "valorUnitarioCentavos" | "custoUnitarioCentavos">[];
  pagamentos: Pick<Pagamento, "valorCentavos" | "data">[];
};

export function resumoDoMes(
  oss: OSResumo[],
  despesas: Pick<Despesa, "data" | "valorCentavos">[],
  mes: string,
): ResumoMes {
  let faturado = 0;
  let custo = 0;
  let recebido = 0;
  let aReceber = 0;
  let entregues = 0;

  for (const os of oss) {
    const fin = financeiroDaOS(os);
    aReceber += fin.saldoCentavos;

    if (os.dataEntrega && mesDe(os.dataEntrega) === mes) {
      faturado += fin.totalCentavos;
      custo += fin.custoCentavos;
      entregues += 1;
    }
    for (const p of os.pagamentos) {
      if (mesDe(p.data) === mes) recebido += Math.max(0, p.valorCentavos);
    }
  }

  const gastos = despesas
    .filter((d) => mesDe(d.data) === mes)
    .reduce((soma, d) => soma + Math.max(0, d.valorCentavos), 0);

  return {
    mes,
    faturadoCentavos: faturado,
    custoPecasCentavos: custo,
    despesasCentavos: gastos,
    lucroCentavos: faturado - custo - gastos,
    recebidoCentavos: recebido,
    aReceberCentavos: aReceber,
    osEntregues: entregues,
  };
}
