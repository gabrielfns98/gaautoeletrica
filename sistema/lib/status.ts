import type { Prioridade, StatusOS, TipoItem } from "@/lib/tipos";

export const STATUS_LABEL: Record<StatusOS, string> = {
  na_fila: "Na fila",
  em_servico: "Em serviço",
  aguardando_peca: "Aguardando peça",
  pronta: "Pronta",
  entregue: "Entregue",
};

export const STATUS_CLASSE: Record<StatusOS, string> = {
  na_fila: "bg-slate-200 text-slate-700",
  em_servico: "bg-blue-100 text-blue-800",
  aguardando_peca: "bg-amber-100 text-amber-800",
  pronta: "bg-green-100 text-green-800",
  entregue: "bg-slate-100 text-slate-500",
};

export const TIPO_ITEM_LABEL: Record<TipoItem, string> = {
  peca_comprada: "Peça comprada",
  peca_reparada: "Peça reparada",
  mao_de_obra: "Mão de obra",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  normal: "Normal",
  urgente: "Urgente",
};
