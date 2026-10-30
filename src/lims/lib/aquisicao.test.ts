import { describe, expect, it } from 'vitest';

import {
  fatorDaAliquota, fatorDePreparo, limiteNaAmostra, resultadoDaLeitura, unidadeDoResultado,
} from './aquisicao';
import type { Preparo } from './aquisicao';

/* Curva de fósforo por colorimetria: abs = 0,02·C, com LD 0,05 mg/L
   e LQ 0,15 mg/L no extrato. */
const curva = { coefAngular: 0.02, coefLinear: 0, lod: 0.05, loq: 0.15 };

/* Mehlich-1 como o laboratório faz: 10 cm³ de solo em 100 mL de
   extrator, sem diluição nem alíquota. Fator 10. */
const mehlich: Preparo = { tomada: 10, unidadeTomada: 'cm3', volumeExtrato: 100 };

/* Digestão de folha: 0,5 g em 50 mL. Fator 100. */
const foliar: Preparo = { tomada: 0.5, unidadeTomada: 'g', volumeExtrato: 50 };

describe('fatorDaAliquota', () => {
  it('é o quanto a alíquota foi recompletada', () => {
    expect(fatorDaAliquota({ tomada: 5, final: 50 })).toBe(10);
  });

  it('sem alíquota o fator é 1', () => {
    expect(fatorDaAliquota()).toBe(1);
  });

  it('alíquota com zero não produz fator', () => {
    expect(fatorDaAliquota({ tomada: 0, final: 50 })).toBeNaN();
    expect(fatorDaAliquota({ tomada: 5, final: 0 })).toBeNaN();
  });
});

describe('fatorDePreparo', () => {
  it('é volume do extrato sobre a tomada', () => {
    expect(fatorDePreparo(mehlich)).toBe(10);
    expect(fatorDePreparo(foliar)).toBe(100);
  });

  it('a diluição multiplica', () => {
    expect(fatorDePreparo({ ...mehlich, diluicao: 5 })).toBe(50);
  });

  it('a alíquota multiplica junto com a diluição', () => {
    expect(fatorDePreparo({ ...foliar, diluicao: 2, aliquota: { tomada: 5, final: 25 } })).toBe(1000);
  });

  it('tomada ou volume inválido não produz fator', () => {
    expect(fatorDePreparo({ ...mehlich, tomada: 0 })).toBeNaN();
    expect(fatorDePreparo({ ...mehlich, volumeExtrato: -1 })).toBeNaN();
    expect(fatorDePreparo({ ...mehlich, diluicao: 0 })).toBeNaN();
  });
});

describe('unidadeDoResultado', () => {
  it('mg/L sobre massa vira mg/kg', () => {
    expect(unidadeDoResultado('mg/L', 'g')).toBe('mg/kg');
  });

  it('mg/L sobre volume de solo vira mg/dm³', () => {
    expect(unidadeDoResultado('mg/L', 'cm3')).toBe('mg/dm³');
  });

  it('curva que já não está em mg/L passa direto', () => {
    expect(unidadeDoResultado('%', 'g')).toBe('%');
  });
});

describe('resultadoDaLeitura', () => {
  it('converte absorbância em resultado na amostra', () => {
    // abs 0,40 → 20 mg/L no extrato → × 10 → 200 mg/dm³
    const r = resultadoDaLeitura(0.4, curva, mehlich, 50);
    expect(r.concentracaoNoExtrato).toBeCloseTo(20, 10);
    expect(r.fator).toBe(10);
    expect(r.resultado).toBeCloseTo(200, 10);
    expect(r.situacao).toBe('quantificavel');
    expect(r.reportavel).toBe(true);
  });

  it('respeita o intercepto da curva', () => {
    const comBranco = { ...curva, coefLinear: 0.02 };
    // (0,42 − 0,02) / 0,02 = 20 mg/L
    expect(resultadoDaLeitura(0.42, comBranco, mehlich, 50).resultado).toBeCloseTo(200, 10);
  });

  /* O ponto do item: o limite é do método de leitura, então ele se
     julga no extrato. Um extrato a 0,10 mg/L está entre LD e LQ, e
     continua não reportável mesmo que × 100 dê um número bonito. */
  it('não reporta número quando o extrato ficou entre LD e LQ', () => {
    const r = resultadoDaLeitura(0.002, curva, foliar, 50);
    expect(r.concentracaoNoExtrato).toBeCloseTo(0.1, 10);
    expect(r.situacao).toBe('entre-lod-loq');
    expect(r.reportavel).toBe(false);
  });

  it('abaixo do limite de detecção não é reportável', () => {
    const r = resultadoDaLeitura(0.0004, curva, mehlich, 50);
    expect(r.situacao).toBe('abaixo-lod');
    expect(r.reportavel).toBe(false);
  });

  /* Extrapolar curva é inventar número: acima do padrão mais alto o
     resultado manda diluir e repetir. */
  it('acima do maior padrão manda diluir, não reporta', () => {
    const r = resultadoDaLeitura(2, curva, mehlich, 50);
    expect(r.concentracaoNoExtrato).toBeCloseTo(100, 10);
    expect(r.situacao).toBe('acima-faixa');
    expect(r.reportavel).toBe(false);
  });

  it('diluir traz a leitura de volta à faixa e muda o resultado pelo fator', () => {
    // Mesma amostra, agora diluída 5×: lê 0,40 (20 mg/L), fator 50.
    const r = resultadoDaLeitura(0.4, curva, { ...mehlich, diluicao: 5 }, 50);
    expect(r.situacao).toBe('quantificavel');
    expect(r.resultado).toBeCloseTo(1000, 10);
  });

  it('curva sem inclinação não produz resultado', () => {
    const r = resultadoDaLeitura(0.4, { ...curva, coefAngular: 0 }, mehlich);
    expect(r.resultado).toBeNaN();
    expect(r.reportavel).toBe(false);
  });

  it('preparo inválido não produz resultado', () => {
    const r = resultadoDaLeitura(0.4, curva, { ...mehlich, tomada: 0 });
    expect(r.resultado).toBeNaN();
    expect(r.reportavel).toBe(false);
  });

  it('leitura não numérica não produz resultado', () => {
    expect(resultadoDaLeitura(Number.NaN, curva, mehlich).reportavel).toBe(false);
  });
});

describe('limiteNaAmostra', () => {
  it('converte o limite do método para a unidade do cliente', () => {
    // LQ 0,15 mg/L no extrato, fator 10 → 1,5 mg/dm³ na amostra
    expect(limiteNaAmostra(curva.loq, mehlich)).toBeCloseTo(1.5, 10);
  });

  it('o mesmo limite fica maior quando a tomada foi menor', () => {
    expect(limiteNaAmostra(curva.loq, foliar)).toBeCloseTo(15, 10);
  });

  it('sem limite cadastrado não inventa número', () => {
    expect(limiteNaAmostra(undefined, mehlich)).toBeNaN();
  });
});
