/* ============================================================
   BANCADA — interpretação de resultado por faixa

   O número sozinho não diz nada ao agrônomo: "P 12 mg/dm³" só
   significa algo contra a tabela de referência que o laboratório
   adota. Por isso a faixa é cadastro (Legenda), não código, e
   este módulo apenas resolve qual legenda vale e em que faixa o
   valor caiu.
   ============================================================ */

import type { FaixaLegenda, Legenda, SeveridadeFaixa } from '../types';

/**
 * Como a severidade aparece no laudo e nas telas. O tipo é a união
 * literal dos tons de `Pilula`, repetida aqui de propósito: lib não
 * importa de components, e o compilador acusa se os tons mudarem.
 */
export const TOM_SEVERIDADE: Record<
  SeveridadeFaixa,
  'neutro' | 'info' | 'sucesso' | 'alerta' | 'erro'
> = {
  critico: 'erro',
  atencao: 'alerta',
  bom: 'info',
  ideal: 'sucesso',
  neutro: 'neutro',
};

export const ROTULO_SEVERIDADE: Record<SeveridadeFaixa, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  bom: 'Bom',
  ideal: 'Ideal',
  neutro: 'Neutro',
};

/**
 * Em qual faixa da legenda o valor caiu.
 *
 * Convenção dos limites: `de` é inclusivo e `ate` é exclusivo. Isso
 * evita o vão que aparece quando a tabela publicada diz "0,41 a 1,20"
 * e o resultado sai 1,205 — com limite exclusivo o valor cai na faixa
 * seguinte em vez de não cair em nenhuma.
 */
export function faixaDe(valor: number, legenda: Legenda | undefined): FaixaLegenda | undefined {
  if (!legenda || !Number.isFinite(valor)) return undefined;
  return legenda.faixas.find(
    (f) => (f.de === undefined || valor >= f.de) && (f.ate === undefined || valor < f.ate),
  );
}

/**
 * Qual legenda vale para o parâmetro.
 *
 * Precedência: legenda da cultura pedida > legenda marcada como padrão
 * > qualquer legenda ativa do parâmetro. Uma legenda de cultura nunca
 * é usada para outra cultura, nem como padrão geral.
 */
export function legendaDe(
  legendas: Legenda[],
  parametroId: string,
  cultura?: string,
): Legenda | undefined {
  const doParametro = legendas.filter((l) => l.ativa && l.parametroId === parametroId);
  if (doParametro.length === 0) return undefined;

  if (cultura) {
    const daCultura = doParametro.find((l) => l.cultura === cultura);
    if (daCultura) return daCultura;
  }
  // Sem legenda geral o resultado fica sem interpretação, e está certo:
  // uma tabela de soja não interpreta amostra de milho. Melhor o laudo
  // dizer "—" do que classificar contra a referência errada.
  return doParametro.find((l) => l.padrao && !l.cultura)
    ?? doParametro.find((l) => !l.cultura);
}

export interface Interpretacao {
  faixa: FaixaLegenda;
  legenda: Legenda;
}

/** Atalho: resolve a legenda e a faixa de uma vez. */
export function interpretar(
  legendas: Legenda[],
  parametroId: string,
  valor: number | undefined,
  cultura?: string,
): Interpretacao | undefined {
  if (valor === undefined) return undefined;
  const legenda = legendaDe(legendas, parametroId, cultura);
  const faixa = faixaDe(valor, legenda);
  return legenda && faixa ? { faixa, legenda } : undefined;
}

/**
 * As referências citadas no rodapé do laudo, sem repetição.
 * Um laudo que interpreta resultado tem de dizer contra o que
 * interpretou — auditor pergunta.
 */
export function fontesCitadas(interpretacoes: Array<Interpretacao | undefined>): string[] {
  const fontes = new Set<string>();
  for (const i of interpretacoes) if (i) fontes.add(i.legenda.fonte);
  return [...fontes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
