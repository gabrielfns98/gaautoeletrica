import { describe, expect, it } from 'vitest';

import {
  avaliarTendencia, calcularEscore, classificarEn, classificarZ, resumirRodada,
} from './interlaboratorial';

describe('classificarZ', () => {
  it('até 2 σ é satisfatório', () => {
    expect(classificarZ(0)).toBe('satisfatorio');
    expect(classificarZ(1.9)).toBe('satisfatorio');
    expect(classificarZ(-2)).toBe('satisfatorio');
  });

  it('entre 2 e 3 é sinal de alerta, não reprovação', () => {
    expect(classificarZ(2.5)).toBe('questionavel');
    expect(classificarZ(-2.99)).toBe('questionavel');
  });

  it('3 σ ou mais é insatisfatório', () => {
    expect(classificarZ(3)).toBe('insatisfatorio');
    expect(classificarZ(-4.2)).toBe('insatisfatorio');
  });

  /* O sinal diz o lado do erro, não a gravidade: −3,5 é tão ruim
     quanto +3,5, e tratar o módulo é o que a norma manda. */
  it('o sinal não muda a gravidade', () => {
    expect(classificarZ(3.5)).toBe(classificarZ(-3.5));
  });
});

describe('calcularEscore', () => {
  it('z é a diferença em unidades do desvio alvo', () => {
    const e = calcularEscore({ valor: 5.8, designado: 5.5, desvioAlvo: 0.15 });
    expect(e.z).toBeCloseTo(2, 10);
    expect(e.desempenho).toBe('satisfatorio');
  });

  /* O mesmo erro absoluto é aprovação num ensaio e reprovação em
     outro: é o σ do programa que define o que é aceitável. */
  it('o mesmo erro muda de veredito com outro desvio alvo', () => {
    const largo = calcularEscore({ valor: 5.8, designado: 5.5, desvioAlvo: 0.3 });
    const estreito = calcularEscore({ valor: 5.8, designado: 5.5, desvioAlvo: 0.05 });
    expect(largo.desempenho).toBe('satisfatorio');
    expect(estreito.desempenho).toBe('insatisfatorio');
  });

  it('erro relativo sai em percentual do designado', () => {
    const e = calcularEscore({ valor: 11, designado: 10, desvioAlvo: 1 });
    expect(e.erroRelativo).toBeCloseTo(10, 10);
  });

  it('designado zero não produz erro relativo', () => {
    expect(calcularEscore({ valor: 0.2, designado: 0, desvioAlvo: 0.1 }).erroRelativo)
      .toBeUndefined();
  });

  /* z' desconta a imprecisão da própria rodada. Sem ele, um
     programa com poucos participantes reprova laboratório por
     incerteza do consenso, não por erro do laboratório. */
  it('z linha afrouxa o julgamento quando o designado é incerto', () => {
    const entrada = {
      valor: 5.95, designado: 5.5, desvioAlvo: 0.15, incertezaDesignado: 0.12,
    };
    const e = calcularEscore(entrada);
    expect(e.z).toBeCloseTo(3, 10);
    expect(Math.abs(e.zLinha!)).toBeLessThan(3);
    // É o z' que julga, então deixa de ser insatisfatório.
    expect(e.desempenho).toBe('questionavel');
  });

  it('sem incerteza do designado, z linha não existe e o z julga', () => {
    const e = calcularEscore({ valor: 5.95, designado: 5.5, desvioAlvo: 0.15 });
    expect(e.zLinha).toBeUndefined();
    expect(e.desempenho).toBe('insatisfatorio');
  });

  it('En só sai com as duas incertezas expandidas', () => {
    const semUma = calcularEscore({
      valor: 5.8, designado: 5.5, desvioAlvo: 0.15, incertezaLaboratorio: 0.2,
    });
    expect(semUma.en).toBeUndefined();

    const completo = calcularEscore({
      valor: 5.8, designado: 5.5, desvioAlvo: 0.15,
      incertezaLaboratorio: 0.3, incertezaExpandidaDesignado: 0.4,
    });
    expect(completo.en).toBeCloseTo(0.3 / Math.sqrt(0.09 + 0.16), 10);
  });

  it('desvio alvo ausente ou zero impede o cálculo', () => {
    const e = calcularEscore({ valor: 5.8, designado: 5.5, desvioAlvo: 0 });
    expect(e.z).toBeUndefined();
    expect(e.faltando).toContain('desvio padrão para avaliação');
  });

  it('resultado ausente diz o que falta em vez de inventar zero', () => {
    const e = calcularEscore({ valor: NaN, designado: 5.5, desvioAlvo: 0.15 });
    expect(e.z).toBeUndefined();
    expect(e.faltando).toContain('resultado do laboratório');
  });
});

describe('classificarEn', () => {
  /* A escala do En não é a do z: 1 é o limite, não 2. Confundir as
     duas aprovaria laboratório com En 1,8. */
  it('o limite do En é 1, não 2', () => {
    expect(classificarEn(0.9)).toBe('satisfatorio');
    expect(classificarEn(1.2)).toBe('questionavel');
    expect(classificarEn(1.8)).toBe('insatisfatorio');
  });
});

describe('resumirRodada', () => {
  const itens = [
    { ensaio: 'pH', z: 0.4, desempenho: 'satisfatorio' as const },
    { ensaio: 'P', z: -2.4, desempenho: 'questionavel' as const },
    { ensaio: 'K', z: 3.6, desempenho: 'insatisfatorio' as const },
    { ensaio: 'Ca', z: 1.1, desempenho: 'satisfatorio' as const },
  ];

  it('conta por desempenho e calcula o índice', () => {
    const r = resumirRodada(itens);
    expect(r.total).toBe(4);
    expect(r.satisfatorios).toBe(2);
    expect(r.questionaveis).toBe(1);
    expect(r.insatisfatorios).toBe(1);
    expect(r.indice).toBe(50);
  });

  it('aponta o pior ensaio pelo módulo do z', () => {
    const r = resumirRodada(itens);
    expect(r.piorEnsaio).toBe('K');
    expect(r.piorZ).toBe(3.6);
  });

  it('o pior pode ser negativo', () => {
    const r = resumirRodada([
      { ensaio: 'A', z: 1.2, desempenho: 'satisfatorio' },
      { ensaio: 'B', z: -4.1, desempenho: 'insatisfatorio' },
    ]);
    expect(r.piorEnsaio).toBe('B');
  });

  it('rodada vazia não divide por zero', () => {
    const r = resumirRodada([]);
    expect(r.indice).toBe(0);
    expect(r.piorZ).toBeUndefined();
  });

  it('ensaio sem z não concorre a pior', () => {
    const r = resumirRodada([
      { ensaio: 'A', desempenho: 'questionavel' },
      { ensaio: 'B', z: 0.5, desempenho: 'satisfatorio' },
    ]);
    expect(r.piorEnsaio).toBe('B');
  });
});

describe('avaliarTendencia', () => {
  /* O defeito que isto pega e o z de uma rodada não pega: um
     laboratório com z = +1,4 em cinco rodadas passa em todas e
     está errado em todas. O método tem desvio, não ruído. */
  it('acusa viés quando as rodadas ficam sempre do mesmo lado', () => {
    const t = avaliarTendencia([1.2, 1.5, 1.4, 1.3]);
    expect(t.tendencia).toBe('tendencia-alta');
    expect(t.mensagem).toMatch(/desvio é do método/);
  });

  it('acusa viés para baixo também', () => {
    expect(avaliarTendencia([-1.3, -1.1, -1.6]).tendencia).toBe('tendencia-baixa');
  });

  /* Um z alto isolado, cercado de rodadas centradas, é dispersão
     normal: apontar viés aí seria alarme falso. */
  it('um z alto isolado não é tendência', () => {
    expect(avaliarTendencia([0.2, -0.4, 2.6]).tendencia).toBe('estavel');
  });

  it('mesmo lado mas perto de zero não é viés', () => {
    expect(avaliarTendencia([0.3, 0.5, 0.4]).tendencia).toBe('estavel');
  });

  it('alternar de lado nunca é tendência', () => {
    expect(avaliarTendencia([1.8, -1.9, 1.7, -1.6]).tendencia).toBe('estavel');
  });

  it('poucas rodadas não bastam para avaliar', () => {
    const t = avaliarTendencia([2.1, 2.3]);
    expect(t.tendencia).toBe('estavel');
    expect(t.mensagem).toMatch(/são precisas 3/);
  });

  /* Viés corrigido não deve pesar para sempre: só as últimas
     rodadas contam. */
  it('viés antigo já corrigido não conta', () => {
    const t = avaliarTendencia([2.4, 2.6, 2.5, 0.1, -0.2, 0.3]);
    expect(t.tendencia).toBe('estavel');
  });

  it('rodada sem z é ignorada', () => {
    expect(avaliarTendencia([NaN, 1.2, 1.5, 1.4]).tendencia).toBe('tendencia-alta');
  });

  it('sem rodada nenhuma não quebra', () => {
    expect(avaliarTendencia([]).rodadas).toBe(0);
  });
});
