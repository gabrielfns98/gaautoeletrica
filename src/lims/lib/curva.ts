/* ============================================================
   BANCADA — curva de calibração analítica
   O instrumento devolve um sinal; a curva traduz esse sinal em
   concentração. Vale para colorimetria, fotometria de chama,
   absorção atômica — tudo que mede por comparação com padrões.
   ============================================================ */

import type { PontoCurva, TipoAjuste } from '../types';

export interface AjusteCurva {
  /** sinal por unidade de concentração */
  coefAngular: number;
  /** sinal no branco (intercepto) */
  coefLinear: number;
  r2: number;
  /** desvio padrão dos resíduos, na unidade do sinal */
  desvioResidual: number;
  /** limite de detecção — 3,3 · s / a (IUPAC/ICH) */
  lod: number;
  /** limite de quantificação — 10 · s / a */
  loq: number;
  pontosUsados: number;
  aprovada: boolean;
  avisos: string[];
}

export const CRITERIOS_CURVA = {
  /** linearidade mínima exigida de uma curva analítica */
  r2Min: 0.995,
  /** abaixo disso a curva é recusada de vez */
  r2Critico: 0.99,
  /** pontos mínimos além do branco */
  pontosMin: 3,
  /** validade padrão da curva, em dias */
  validadeDias: 30,
} as const;

/**
 * Ajusta a reta aos pontos da curva.
 *
 * O ajuste forçado pela origem só deve ser usado quando o método
 * garante sinal nulo em concentração zero; fora disso ele embute
 * o erro do branco em toda a faixa.
 */
export function ajustarCurva(
  pontos: PontoCurva[],
  tipo: TipoAjuste = 'linear',
): AjusteCurva {
  const avisos: string[] = [];
  const usados = pontos.filter((p) => !p.descartado
    && Number.isFinite(p.concentracao) && Number.isFinite(p.leitura));
  const n = usados.length;

  const vazio: AjusteCurva = {
    coefAngular: 0, coefLinear: 0, r2: 0, desvioResidual: 0,
    lod: 0, loq: 0, pontosUsados: n, aprovada: false,
    avisos: ['São necessários ao menos 2 pontos válidos.'],
  };
  if (n < 2) return vazio;

  const xs = usados.map((p) => p.concentracao);
  const ys = usados.map((p) => p.leitura);

  let coefAngular: number;
  let coefLinear: number;

  if (tipo === 'linear-sem-intercepto') {
    const sxx = xs.reduce((s, x) => s + x * x, 0);
    const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0);
    coefAngular = sxx === 0 ? 0 : sxy / sxx;
    coefLinear = 0;
  } else {
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my);
      sxx += (xs[i] - mx) ** 2;
    }
    coefAngular = sxx === 0 ? 0 : sxy / sxx;
    coefLinear = my - coefAngular * mx;
  }

  // R² calculado sobre os resíduos do modelo efetivamente usado,
  // para que o ajuste pela origem não ganhe um R² otimista.
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sqRes = 0, sqTot = 0;
  for (let i = 0; i < n; i++) {
    const previsto = coefAngular * xs[i] + coefLinear;
    sqRes += (ys[i] - previsto) ** 2;
    sqTot += (ys[i] - my) ** 2;
  }
  const r2 = sqTot === 0 ? 0 : Math.max(0, 1 - sqRes / sqTot);

  const graus = tipo === 'linear-sem-intercepto' ? n - 1 : n - 2;
  const desvioResidual = graus > 0 ? Math.sqrt(sqRes / graus) : 0;

  const a = Math.abs(coefAngular);
  const lod = a === 0 ? 0 : (3.3 * desvioResidual) / a;
  const loq = a === 0 ? 0 : (10 * desvioResidual) / a;

  if (n < CRITERIOS_CURVA.pontosMin + 1) {
    avisos.push(`Apenas ${n} pontos no ajuste — recomenda-se branco mais ${CRITERIOS_CURVA.pontosMin} padrões.`);
  }
  if (r2 < CRITERIOS_CURVA.r2Min) {
    avisos.push(`Linearidade R² = ${r2.toFixed(5)} abaixo de ${CRITERIOS_CURVA.r2Min}. Verifique preparo dos padrões e limpeza da cubeta.`);
  }
  if (coefAngular === 0) {
    avisos.push('Coeficiente angular nulo: o sinal não responde à concentração.');
  }
  if (tipo === 'linear' && Math.abs(coefLinear) > Math.abs(coefAngular) * (Math.max(...xs) || 1) * 0.1) {
    avisos.push('Intercepto alto em relação à faixa — possível contaminação do branco.');
  }

  return {
    coefAngular, coefLinear, r2, desvioResidual, lod, loq,
    pontosUsados: n,
    aprovada: r2 >= CRITERIOS_CURVA.r2Min && coefAngular !== 0 && n >= 2,
    avisos,
  };
}

/**
 * Converte a leitura do instrumento em concentração.
 * A diluição multiplica no fim: o que se leu foi o extrato diluído.
 */
export function concentracaoDaLeitura(
  leitura: number,
  ajuste: Pick<AjusteCurva, 'coefAngular' | 'coefLinear'>,
  diluicao = 1,
): number {
  if (!Number.isFinite(leitura) || ajuste.coefAngular === 0) return NaN;
  return ((leitura - ajuste.coefLinear) / ajuste.coefAngular) * diluicao;
}

/** Caminho inverso — usado para desenhar a reta e simular padrões. */
export function leituraDaConcentracao(
  concentracao: number,
  ajuste: Pick<AjusteCurva, 'coefAngular' | 'coefLinear'>,
): number {
  return ajuste.coefAngular * concentracao + ajuste.coefLinear;
}

export type SituacaoQuantificacao = 'abaixo-lod' | 'entre-lod-loq' | 'quantificavel' | 'acima-faixa';

/**
 * Onde o resultado cai em relação aos limites do método. Um valor
 * entre LOD e LOQ foi detectado mas não pode ser reportado como
 * número — o laudo diz "< LOQ".
 */
export function situacaoDoResultado(
  concentracao: number,
  ajuste: Pick<AjusteCurva, 'lod' | 'loq'>,
  maiorPadrao?: number,
): SituacaoQuantificacao {
  if (!Number.isFinite(concentracao)) return 'abaixo-lod';
  if (concentracao < ajuste.lod) return 'abaixo-lod';
  if (concentracao < ajuste.loq) return 'entre-lod-loq';
  if (maiorPadrao !== undefined && concentracao > maiorPadrao) return 'acima-faixa';
  return 'quantificavel';
}

export function rotuloSituacao(
  situacao: SituacaoQuantificacao,
  ajuste: Pick<AjusteCurva, 'lod' | 'loq'>,
  casas = 2,
): string {
  switch (situacao) {
    case 'abaixo-lod': return `< LD (${ajuste.lod.toFixed(casas)})`;
    case 'entre-lod-loq': return `< LQ (${ajuste.loq.toFixed(casas)})`;
    case 'acima-faixa': return 'acima da faixa — diluir e repetir';
    default: return 'quantificável';
  }
}
