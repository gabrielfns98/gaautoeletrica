/** Classes reaproveitadas pelas telas, para tudo ter a mesma cara. */

export const CARTAO = "rounded-xl border border-slate-200 bg-white shadow-sm";
export const CARTAO_PAD = `${CARTAO} p-4 sm:p-5`;

export const TITULO_SECAO =
  "text-xs font-bold uppercase tracking-wider text-slate-500";

export const CAMPO =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base " +
  "outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";

export const ROTULO = "block text-sm font-medium text-slate-700";

export const BOTAO_PRIMARIO =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 " +
  "text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50";

export const BOTAO_SECUNDARIO =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 " +
  "bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

export const BOTAO_FANTASMA =
  "inline-flex items-center justify-center rounded-lg px-2.5 py-2 text-sm font-medium " +
  "text-slate-500 transition hover:bg-slate-100 hover:text-slate-800";

/** Faixa colorida na lateral do cartão, por status. */
export const BORDA_STATUS: Record<string, string> = {
  na_fila: "bg-slate-300",
  em_servico: "bg-blue-500",
  aguardando_peca: "bg-amber-500",
  pronta: "bg-emerald-500",
  entregue: "bg-slate-200",
};
