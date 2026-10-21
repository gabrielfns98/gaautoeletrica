/** Tipos do domínio. Os dados ficam num JSON no Vercel Blob (lib/db.ts). */

export type Prioridade = "normal" | "urgente";

export type StatusOS =
  | "na_fila"
  | "em_servico"
  | "aguardando_peca"
  | "pronta"
  | "entregue";

export type TipoItem = "peca_comprada" | "peca_reparada" | "mao_de_obra";

export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "cartao_debito"
  | "cartao_credito"
  | "transferencia"
  | "boleto";

export type CategoriaDespesa =
  | "aluguel"
  | "salarios"
  | "ferramentas"
  | "energia_agua"
  | "impostos"
  | "outros";

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  obs: string | null;
  criadoEm: string;
};

export type Van = {
  id: string;
  clienteId: string;
  placa: string;
  modelo: string;
  ano: number | null;
  obs: string | null;
  criadoEm: string;
};

export type OS = {
  id: string;
  numero: number;
  vanId: string;
  dataEntrada: string;
  km: number | null;
  prioridade: Prioridade;
  status: StatusOS;
  fixada: boolean;
  previsaoEntrega: string | null;
  dataEntrega: string | null;
  problemaRelatado: string;
  problemaReal: string | null;
  servicoFeito: string | null;
  descontoCentavos: number;
  validadeDias: number;
  observacoesOrcamento: string | null;
};

export type ItemOS = {
  id: string;
  osId: string;
  tipo: TipoItem;
  descricao: string;
  quantidade: number;
  valorUnitarioCentavos: number;
  /** Quanto a oficina pagou pela peça. Só para o financeiro: nunca vai ao PDF. */
  custoUnitarioCentavos: number;
  criadoEm: string;
};

/** Dinheiro que o cliente pagou numa OS. Uma OS pode ter vários pagamentos. */
export type Pagamento = {
  id: string;
  osId: string;
  data: string;
  valorCentavos: number;
  forma: FormaPagamento;
  obs: string | null;
  criadoEm: string;
};

/** Despesa da oficina, sem ligação com OS (aluguel, salário, ferramenta...). */
export type Despesa = {
  id: string;
  data: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valorCentavos: number;
  criadoEm: string;
};

/** OS com a van e o cliente já resolvidos, como as telas usam. */
export type OSCompleta = OS & {
  van: Van & { cliente: Cliente };
  itens: ItemOS[];
  pagamentos: Pagamento[];
};
