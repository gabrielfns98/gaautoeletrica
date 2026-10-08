/* ============================================================
   BANCADA — motor de potenciometria
   Nernst, calibração multiponto, compensação de temperatura,
   detecção de estabilidade, controle de qualidade e
   interpretação agronômica do pH.
   ============================================================ */

import type { Calibracao, PontoCalibracao, PontoTrace } from '../types';

/* ---------------- Constantes físicas ---------------- */

/** Constante dos gases (J·K⁻¹·mol⁻¹) */
export const R = 8.314462618;
/** Constante de Faraday (C·mol⁻¹) */
export const F = 96485.33212;
/** Zero absoluto em °C */
export const KELVIN = 273.15;
/** Potencial de um eletrodo ideal a 25 °C, em mV por unidade de pH */
export const SLOPE_TEORICO_25C = 59.16;
/** pH isopotencial do eletrodo de vidro combinado */
export const PH_ISOPOTENCIAL = 7;

/**
 * Slope nernstiano teórico na temperatura informada.
 *   S(T) = ln(10) · R · T / F   [V/pH]  →  ×1000 para mV/pH
 */
export function slopeTeorico(temperaturaC: number): number {
  return (Math.LN10 * R * (temperaturaC + KELVIN) * 1000) / F;
}

/* ---------------- Tampões certificados ---------------- */

/**
 * Valor de pH dos tampões padrão em função da temperatura
 * (DIN 19266 / NIST). Interpolação linear entre os pontos tabelados.
 */
const TABELA_TAMPOES: Record<string, Array<[number, number]>> = {
  '4.01': [[0, 4.00], [5, 4.00], [10, 4.00], [15, 4.00], [20, 4.00],
           [25, 4.01], [30, 4.01], [35, 4.02], [40, 4.03], [50, 4.06]],
  '7.00': [[0, 7.11], [5, 7.09], [10, 7.06], [15, 7.04], [20, 7.02],
           [25, 7.00], [30, 6.99], [35, 6.98], [40, 6.97], [50, 6.97]],
  '10.01': [[0, 10.32], [5, 10.25], [10, 10.18], [15, 10.12], [20, 10.06],
            [25, 10.01], [30, 9.96], [35, 9.91], [40, 9.88], [50, 9.80]],
};

export const TAMPOES_DISPONIVEIS = [4.01, 7.0, 10.01] as const;

/** pH real do tampão nominal na temperatura de uso. */
export function valorTampao(nominal: number, temperaturaC: number): number {
  // escolhe a tabela do tampão certificado mais próximo do valor nominal
  const chave = Object.keys(TABELA_TAMPOES).reduce((melhor, k) =>
    Math.abs(Number(k) - nominal) < Math.abs(Number(melhor) - nominal) ? k : melhor);
  if (Math.abs(Number(chave) - nominal) > 0.5) return nominal;
  const tabela = TABELA_TAMPOES[chave];

  const t = clamp(temperaturaC, tabela[0][0], tabela[tabela.length - 1][0]);
  for (let i = 0; i < tabela.length - 1; i++) {
    const [t0, v0] = tabela[i];
    const [t1, v1] = tabela[i + 1];
    if (t >= t0 && t <= t1) {
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return v0 + f * (v1 - v0);
    }
  }
  return nominal;
}

/* ---------------- Calibração ---------------- */

export interface ResultadoCalibracao {
  /** mV por unidade de pH (sempre positivo, módulo do coeficiente angular) */
  slopeMvPorPh: number;
  /** % em relação ao slope nernstiano teórico na temperatura média */
  slopePercentual: number;
  /** potencial de assimetria: mV lidos no ponto isopotencial (pH 7) */
  offsetMv: number;
  r2: number;
  temperaturaMedia: number;
  aprovada: boolean;
  avisos: string[];
}

/** Critérios de aceitação usuais em laboratório acreditado. */
export const CRITERIOS = {
  slopeMin: 95,
  slopeMax: 105,
  slopeAlerta: 97,
  offsetMaxMv: 30,
  r2Min: 0.999,
  /** deriva máxima aceita para considerar a leitura estável */
  derivaMaxMvPorMin: 0.6,
  /** janela de observação da estabilidade, em segundos */
  janelaEstabilidadeS: 10,
  /** desvio relativo máximo entre réplicas */
  rsdMaxPercentual: 2,
};

/**
 * Regressão linear de mV sobre pH a partir dos pontos de tampão.
 * O eletrodo de vidro tem resposta negativa: quanto maior o pH,
 * menor o potencial — daí o módulo no slope.
 */
export function calcularCalibracao(pontos: PontoCalibracao[]): ResultadoCalibracao {
  const avisos: string[] = [];
  const validos = pontos.filter((p) => Number.isFinite(p.mV));
  const temperaturaMedia =
    validos.reduce((s, p) => s + p.temperatura, 0) / (validos.length || 1);

  if (validos.length < 2) {
    return {
      slopeMvPorPh: 0, slopePercentual: 0, offsetMv: 0, r2: 0,
      temperaturaMedia: temperaturaMedia || 25, aprovada: false,
      avisos: ['São necessários no mínimo 2 pontos de calibração.'],
    };
  }

  // x = pH real do tampão na temperatura medida, y = mV lidos
  const xs = validos.map((p) => valorTampao(p.tampao, p.temperatura));
  const ys = validos.map((p) => p.mV);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }

  const coefAngular = sxx === 0 ? 0 : sxy / sxx;     // mV/pH (negativo)
  const coefLinear = my - coefAngular * mx;          // mV em pH 0
  const r2 = sxx === 0 || syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);

  const slopeMvPorPh = Math.abs(coefAngular);
  const teorico = slopeTeorico(temperaturaMedia);
  const slopePercentual = (slopeMvPorPh / teorico) * 100;
  const offsetMv = coefAngular * PH_ISOPOTENCIAL + coefLinear;

  if (slopePercentual < CRITERIOS.slopeMin)
    avisos.push(`Slope ${slopePercentual.toFixed(1)}% abaixo do mínimo de ${CRITERIOS.slopeMin}% — eletrodo possivelmente desgastado ou sujo.`);
  else if (slopePercentual < CRITERIOS.slopeAlerta)
    avisos.push(`Slope ${slopePercentual.toFixed(1)}% em faixa de atenção. Avalie limpeza do bulbo.`);
  if (slopePercentual > CRITERIOS.slopeMax)
    avisos.push(`Slope ${slopePercentual.toFixed(1)}% acima do máximo — verifique a identidade dos tampões.`);
  if (Math.abs(offsetMv) > CRITERIOS.offsetMaxMv)
    avisos.push(`Offset de ${offsetMv.toFixed(1)} mV excede ±${CRITERIOS.offsetMaxMv} mV — junção de referência possivelmente obstruída.`);
  if (n >= 3 && r2 < CRITERIOS.r2Min)
    avisos.push(`Linearidade R² = ${r2.toFixed(5)} abaixo de ${CRITERIOS.r2Min}.`);

  const aprovada =
    slopePercentual >= CRITERIOS.slopeMin &&
    slopePercentual <= CRITERIOS.slopeMax &&
    Math.abs(offsetMv) <= CRITERIOS.offsetMaxMv &&
    (n < 3 || r2 >= CRITERIOS.r2Min);

  return { slopeMvPorPh, slopePercentual, offsetMv, r2, temperaturaMedia, aprovada, avisos };
}

/* ---------------- Conversão mV → pH ---------------- */

/**
 * pH a partir do potencial medido, usando a calibração vigente.
 * O slope é reescalado para a temperatura da amostra (ATC):
 *   S(T) = S(T_cal) · T / T_cal     (relação nernstiana linear em K)
 *   pH   = pH_iso + (E_iso − E) / S(T)
 */
export function phDeMv(
  mV: number,
  temperaturaC: number,
  calib: Pick<Calibracao, 'slopeMvPorPh' | 'offsetMv'> & { temperaturaCalibracao?: number },
): number {
  const tCal = calib.temperaturaCalibracao ?? 25;
  const fator = (temperaturaC + KELVIN) / (tCal + KELVIN);
  const slope = calib.slopeMvPorPh * fator;
  if (slope === 0) return NaN;
  return PH_ISOPOTENCIAL + (calib.offsetMv - mV) / slope;
}

/** Potencial esperado para um dado pH — usado pelo simulador de bancada. */
export function mvDePh(
  ph: number,
  temperaturaC: number,
  calib: Pick<Calibracao, 'slopeMvPorPh' | 'offsetMv'> & { temperaturaCalibracao?: number },
): number {
  const tCal = calib.temperaturaCalibracao ?? 25;
  const slope = calib.slopeMvPorPh * ((temperaturaC + KELVIN) / (tCal + KELVIN));
  return calib.offsetMv - slope * (ph - PH_ISOPOTENCIAL);
}

/**
 * Normaliza o pH medido para a temperatura de referência de 25 °C.
 *
 * A compensação automática de temperatura corrige apenas a resposta do
 * eletrodo. O coeficiente próprio da amostra depende da matriz: suspensões
 * de solo variam cerca de −0,006 pH/°C; águas naturais tamponadas, bem menos.
 */
const COEF_TEMP_MATRIZ: Record<string, number> = {
  H2O: -0.006, CaCl2: -0.005, KCl: -0.005, SMP: -0.004, direto: -0.003,
};

export function corrigirPara25C(
  ph: number,
  temperaturaC: number,
  extrator: keyof typeof COEF_TEMP_MATRIZ = 'H2O',
): number {
  const coef = COEF_TEMP_MATRIZ[extrator] ?? -0.005;
  // pH(25) = pH(T) + (dpH/dT) · (25 − T)
  return ph + coef * (25 - temperaturaC);
}

/* ---------------- Estabilidade da leitura ---------------- */

export interface AnaliseEstabilidade {
  estavel: boolean;
  derivaMvPorMin: number;
  desvioPadraoPh: number;
  amostrasAvaliadas: number;
  tempoDecorridoS: number;
}

/**
 * Avalia a janela final do trace e decide se o sinal estabilizou.
 * O critério é o mesmo adotado pelos potenciômetros de bancada:
 * deriva do potencial abaixo de um limiar durante uma janela mínima.
 */
export function analisarEstabilidade(
  trace: PontoTrace[],
  janelaS = CRITERIOS.janelaEstabilidadeS,
  derivaMax = CRITERIOS.derivaMaxMvPorMin,
): AnaliseEstabilidade {
  if (trace.length < 2) {
    return { estavel: false, derivaMvPorMin: Infinity, desvioPadraoPh: 0,
             amostrasAvaliadas: trace.length, tempoDecorridoS: 0 };
  }

  const tFim = trace[trace.length - 1].t;
  const janela = trace.filter((p) => p.t >= tFim - janelaS);
  if (janela.length < 3) {
    return { estavel: false, derivaMvPorMin: Infinity, desvioPadraoPh: 0,
             amostrasAvaliadas: janela.length, tempoDecorridoS: tFim };
  }

  // regressão de mV sobre t → deriva em mV/s
  const n = janela.length;
  const mt = janela.reduce((s, p) => s + p.t, 0) / n;
  const mv = janela.reduce((s, p) => s + p.mV, 0) / n;
  let stv = 0, stt = 0;
  for (const p of janela) {
    stv += (p.t - mt) * (p.mV - mv);
    stt += (p.t - mt) ** 2;
  }
  const derivaMvPorS = stt === 0 ? 0 : stv / stt;
  const derivaMvPorMin = Math.abs(derivaMvPorS * 60);

  const mph = janela.reduce((s, p) => s + p.ph, 0) / n;
  const desvioPadraoPh = Math.sqrt(
    janela.reduce((s, p) => s + (p.ph - mph) ** 2, 0) / (n - 1),
  );

  return {
    estavel: derivaMvPorMin <= derivaMax && tFim >= janelaS,
    derivaMvPorMin,
    desvioPadraoPh,
    amostrasAvaliadas: n,
    tempoDecorridoS: tFim,
  };
}

/* ---------------- Réplicas ---------------- */

export interface AnaliseReplicas {
  media: number;
  desvioPadrao: number;
  /** desvio padrão relativo, em % */
  rsd: number;
  amplitude: number;
  conforme: boolean;
}

export function analisarReplicas(valores: number[]): AnaliseReplicas {
  const n = valores.length;
  if (n === 0) return { media: NaN, desvioPadrao: 0, rsd: 0, amplitude: 0, conforme: false };
  const media = valores.reduce((a, b) => a + b, 0) / n;
  const desvioPadrao = n < 2 ? 0 :
    Math.sqrt(valores.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1));
  const rsd = media === 0 ? 0 : (desvioPadrao / Math.abs(media)) * 100;
  return {
    media, desvioPadrao, rsd,
    amplitude: Math.max(...valores) - Math.min(...valores),
    conforme: n < 2 || rsd <= CRITERIOS.rsdMaxPercentual,
  };
}

/* ---------------- Controle de qualidade (Westgard) ---------------- */

export interface AvaliacaoCQ {
  zScore: number;
  resultado: 'aprovado' | 'alerta' | 'reprovado';
  regraViolada?: string;
  mensagem: string;
}

/**
 * Aplica as regras de Westgard sobre a série histórica de um controle.
 * `historico` deve vir em ordem cronológica, o último sendo o ponto atual.
 */
export function avaliarCQ(
  historico: number[],
  alvo: number,
  desvioPadrao: number,
): AvaliacaoCQ {
  const atual = historico[historico.length - 1];
  const z = desvioPadrao === 0 ? 0 : (atual - alvo) / desvioPadrao;
  const zs = historico.map((v) => (desvioPadrao === 0 ? 0 : (v - alvo) / desvioPadrao));
  const ult = (k: number) => zs.slice(-k);

  if (Math.abs(z) > 3)
    return { zScore: z, resultado: 'reprovado', regraViolada: '1-3s',
             mensagem: 'Ponto além de 3σ. Série rejeitada — recalibrar e repetir a corrida.' };

  const dois = ult(2);
  if (dois.length === 2 && dois.every((v) => v > 2) )
    return { zScore: z, resultado: 'reprovado', regraViolada: '2-2s',
             mensagem: 'Dois pontos consecutivos acima de +2σ. Erro sistemático.' };
  if (dois.length === 2 && dois.every((v) => v < -2))
    return { zScore: z, resultado: 'reprovado', regraViolada: '2-2s',
             mensagem: 'Dois pontos consecutivos abaixo de −2σ. Erro sistemático.' };
  if (dois.length === 2 && Math.abs(dois[0] - dois[1]) > 4)
    return { zScore: z, resultado: 'reprovado', regraViolada: 'R-4s',
             mensagem: 'Amplitude maior que 4σ entre pontos consecutivos. Erro aleatório.' };

  const quatro = ult(4);
  if (quatro.length === 4 && (quatro.every((v) => v > 1) || quatro.every((v) => v < -1)))
    return { zScore: z, resultado: 'reprovado', regraViolada: '4-1s',
             mensagem: 'Quatro pontos consecutivos além de 1σ no mesmo lado.' };

  const dez = ult(10);
  if (dez.length === 10 && (dez.every((v) => v > 0) || dez.every((v) => v < 0)))
    return { zScore: z, resultado: 'reprovado', regraViolada: '10x',
             mensagem: 'Dez pontos consecutivos do mesmo lado da média. Tendência.' };

  if (Math.abs(z) > 2)
    return { zScore: z, resultado: 'alerta', regraViolada: '1-2s',
             mensagem: 'Ponto além de 2σ. Advertência — acompanhar a próxima corrida.' };

  return { zScore: z, resultado: 'aprovado', mensagem: 'Dentro dos limites de controle.' };
}

/* ---------------- Interpretação agronômica ---------------- */

export interface FaixaPh {
  rotulo: string;
  descricao: string;
  /** índice 0–14 usado para escolher a cor do espectro */
  tom: number;
  severidade: 'critico' | 'atencao' | 'ideal' | 'bom';
}

/**
 * Classificação da acidez ativa.
 *  - H2O  → CFSEMG, 5ª aproximação
 *  - CaCl2 → IAC, Boletim Técnico 100
 *  - água/efluente → CONAMA 357/2005 e 430/2011
 */
export function classificarPh(
  ph: number,
  extrator: 'H2O' | 'CaCl2' | 'KCl' | 'SMP' | 'direto' = 'H2O',
): FaixaPh {
  if (!Number.isFinite(ph)) {
    return { rotulo: '—', descricao: 'Sem leitura', tom: 7, severidade: 'atencao' };
  }

  if (extrator === 'direto') {
    if (ph < 5) return { rotulo: 'Ácido', descricao: 'Fora do padrão de lançamento (CONAMA 430: 5 a 9)', tom: 3, severidade: 'critico' };
    if (ph < 6) return { rotulo: 'Levemente ácido', descricao: 'Conforme para lançamento, fora do padrão de corpo hídrico classe 2', tom: 5, severidade: 'atencao' };
    if (ph <= 9) return { rotulo: 'Conforme', descricao: 'Dentro do padrão CONAMA 430/2011', tom: 7, severidade: 'ideal' };
    return { rotulo: 'Alcalino', descricao: 'Acima do padrão de lançamento (CONAMA 430: 5 a 9)', tom: 11, severidade: 'critico' };
  }

  if (extrator === 'SMP') {
    if (ph <= 4.8) return { rotulo: 'Acidez potencial muito alta', descricao: 'H+Al elevadíssimo — calagem pesada indicada', tom: 1, severidade: 'critico' };
    if (ph <= 5.4) return { rotulo: 'Acidez potencial alta', descricao: 'H+Al alto — recomenda-se calagem', tom: 3, severidade: 'atencao' };
    if (ph <= 6.2) return { rotulo: 'Acidez potencial média', descricao: 'H+Al moderado', tom: 6, severidade: 'bom' };
    return { rotulo: 'Acidez potencial baixa', descricao: 'H+Al reduzido — calagem dispensável', tom: 8, severidade: 'ideal' };
  }

  if (extrator === 'CaCl2') {
    if (ph <= 4.3) return { rotulo: 'Acidez muito alta', descricao: 'Boletim 100 — correção urgente', tom: 1, severidade: 'critico' };
    if (ph <= 5.0) return { rotulo: 'Acidez alta', descricao: 'Boletim 100 — calagem recomendada', tom: 3, severidade: 'critico' };
    if (ph <= 5.5) return { rotulo: 'Acidez média', descricao: 'Boletim 100 — correção parcial', tom: 5, severidade: 'atencao' };
    if (ph <= 6.0) return { rotulo: 'Acidez baixa', descricao: 'Boletim 100 — faixa adequada à maioria das culturas', tom: 7, severidade: 'ideal' };
    if (ph <= 7.0) return { rotulo: 'Acidez muito baixa', descricao: 'Boletim 100 — próximo da neutralidade', tom: 8, severidade: 'bom' };
    return { rotulo: 'Alcalino', descricao: 'Risco de indisponibilidade de micronutrientes', tom: 11, severidade: 'atencao' };
  }

  // H2O e KCl → CFSEMG
  if (ph < 4.5) return { rotulo: 'Muito baixo', descricao: 'Acidez muito elevada — provável toxidez por alumínio', tom: 1, severidade: 'critico' };
  if (ph <= 5.4) return { rotulo: 'Baixo', descricao: 'Acidez elevada — calagem recomendada', tom: 4, severidade: 'critico' };
  if (ph <= 6.0) return { rotulo: 'Bom', descricao: 'Faixa adequada — máxima disponibilidade de nutrientes', tom: 7, severidade: 'ideal' };
  if (ph <= 7.0) return { rotulo: 'Alto', descricao: 'Acidez baixa — monitorar micronutrientes', tom: 8, severidade: 'bom' };
  return { rotulo: 'Muito alto', descricao: 'Alcalino — risco de deficiência de Fe, Mn, Zn e B', tom: 11, severidade: 'atencao' };
}

/**
 * Acidez potencial estimada pelo índice SMP (CFSEMG):
 *   H+Al = e^(7,76 − 1,053 · pH_SMP)   em cmolc/dm³
 */
export function hMaisAlPorSmp(phSmp: number): number {
  return Math.exp(7.76 - 1.053 * phSmp);
}

/**
 * Necessidade de calagem pelo método da saturação por bases:
 *   NC = CTC · (V₂ − V₁) / (100 · PRNT/100)   em t/ha
 */
export function necessidadeCalagem(
  ctc: number, saturacaoAtual: number, saturacaoDesejada: number, prnt = 85,
): number {
  if (saturacaoDesejada <= saturacaoAtual) return 0;
  return (ctc * (saturacaoDesejada - saturacaoAtual)) / prnt;
}

/* ---------------- Utilidades ---------------- */

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Índice 0–14 usado para indexar as variáveis CSS --ph-N. */
export function tomDoPh(ph: number): number {
  return Math.round(clamp(Number.isFinite(ph) ? ph : 7, 0, 14));
}

export function corDoPh(ph: number): string {
  return `hsl(var(--ph-${tomDoPh(ph)}))`;
}

/** Arredondamento half-up determinístico, como exigido em laudo. */
export function arredondar(valor: number, casas: number): number {
  if (!Number.isFinite(valor)) return NaN;
  const f = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * f) / f;
}
