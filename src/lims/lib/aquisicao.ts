/* ============================================================
   BANCADA — da leitura bruta ao resultado

   O espectrofotômetro devolve absorbância, a absorção atômica
   devolve concentração no extrato, o fotômetro de chama devolve
   intensidade. Nenhum deles devolve o número que vai no laudo: entre
   um e outro estão a curva de calibração, o preparo da amostra
   (massa ou volume tomado, volume do extrato, alíquota) e a diluição.

   Essa conta é feita hoje em planilha, fora do sistema, e é onde o
   laboratório erra em silêncio. Aqui ela é uma função pura, com os
   limites do método respeitados: resultado abaixo do limite de
   quantificação não vira número no laudo.
   ============================================================ */

import { concentracaoDaLeitura, situacaoDoResultado } from './curva';
import type { AjusteCurva, SituacaoQuantificacao } from './curva';

/**
 * O preparo da amostra, como a bancada anota na folha de trabalho.
 *
 * Solo trabalha por volume (cachimbo de 10 cm³); folha, fertilizante
 * e ração trabalham por massa. Os dois casos cabem aqui: quem manda é
 * `tomada`, e `unidadeTomada` diz se o denominador é grama ou cm³,
 * porque é ele que define a unidade do resultado (mg/kg ou mg/dm³).
 */
export interface Preparo {
  /** massa (g) ou volume (cm³) de amostra tomado para a extração */
  tomada: number;
  unidadeTomada: 'g' | 'cm3';
  /** volume final do extrato, em mL */
  volumeExtrato: number;
  /**
   * Diluição feita depois da extração, como fator (10 significa que
   * 1 mL de extrato virou 10 mL). 1 é "não diluiu".
   */
  diluicao?: number;
  /**
   * Alíquota: quando só parte do extrato foi levada ao aparelho e
   * recompletada. `{ tomada: 5, final: 50 }` é um fator 10.
   */
  aliquota?: { tomada: number; final: number };
}

export interface ResultadoAquisicao {
  /** concentração lida no extrato que foi ao aparelho, na unidade da curva */
  concentracaoNoExtrato: number;
  /** fator total que leva do extrato à amostra */
  fator: number;
  /** o número do laudo, na unidade do parâmetro */
  resultado: number;
  situacao: SituacaoQuantificacao;
  /** false quando o resultado não pode ser reportado como número */
  reportavel: boolean;
}

/** O fator de diluição que a alíquota representa. */
export function fatorDaAliquota(aliquota?: { tomada: number; final: number }): number {
  if (!aliquota) return 1;
  const { tomada, final } = aliquota;
  if (!(tomada > 0) || !(final > 0)) return NaN;
  return final / tomada;
}

/**
 * Quantas unidades de amostra o extrato representa.
 *
 * mg/L no extrato × mL de extrato = µg no extrato; dividido pela
 * tomada em g dá µg/g, que é mg/kg. Com a tomada em cm³ o mesmo
 * caminho dá mg/dm³. Em ambos os casos o fator é volume/tomada, e as
 * diluições multiplicam.
 */
export function fatorDePreparo(preparo: Preparo): number {
  const { tomada, volumeExtrato } = preparo;
  if (!(tomada > 0) || !(volumeExtrato > 0)) return NaN;
  const diluicao = preparo.diluicao ?? 1;
  if (!(diluicao > 0)) return NaN;
  const aliquota = fatorDaAliquota(preparo.aliquota);
  if (!Number.isFinite(aliquota)) return NaN;
  return (volumeExtrato / tomada) * diluicao * aliquota;
}

/** A unidade que o fator produz, dada a unidade da curva. */
export function unidadeDoResultado(unidadeCurva: string, unidadeTomada: Preparo['unidadeTomada']): string {
  if (unidadeCurva !== 'mg/L') return unidadeCurva;
  return unidadeTomada === 'g' ? 'mg/kg' : 'mg/dm³';
}

/**
 * Leitura bruta → resultado.
 *
 * `maiorPadrao` é a concentração do padrão mais alto da curva: acima
 * dele o aparelho extrapolou, e extrapolar curva é inventar número.
 * A situação resultante manda diluir e repetir, em vez de reportar.
 */
export function resultadoDaLeitura(
  leitura: number,
  ajuste: Pick<AjusteCurva, 'coefAngular' | 'coefLinear' | 'lod' | 'loq'>,
  preparo: Preparo,
  maiorPadrao?: number,
): ResultadoAquisicao {
  const concentracaoNoExtrato = concentracaoDaLeitura(leitura, ajuste);
  const fator = fatorDePreparo(preparo);

  if (!Number.isFinite(concentracaoNoExtrato) || !Number.isFinite(fator)) {
    return {
      concentracaoNoExtrato: NaN, fator: NaN, resultado: NaN,
      situacao: 'abaixo-lod', reportavel: false,
    };
  }

  /* A situação se decide no extrato, não no resultado final: LD e LQ
     são do método de leitura, e multiplicá-los pelo fator junto com o
     resultado faria um extrato no limite passar por quantificável. */
  const situacao = situacaoDoResultado(concentracaoNoExtrato, ajuste, maiorPadrao);

  return {
    concentracaoNoExtrato,
    fator,
    resultado: concentracaoNoExtrato * fator,
    situacao,
    reportavel: situacao === 'quantificavel',
  };
}

/**
 * Como o resultado aparece quando não é reportável como número.
 * O laudo diz "< LQ" com o limite convertido para a unidade da
 * amostra — o cliente precisa do limite na unidade dele, não na do
 * extrato.
 */
export function limiteNaAmostra(
  limite: number | undefined,
  preparo: Preparo,
): number {
  if (limite === undefined) return NaN;
  const fator = fatorDePreparo(preparo);
  return Number.isFinite(fator) ? limite * fator : NaN;
}
