import { describe, expect, it } from 'vitest';

import {
  abaixoDoLq, calcularRelacoes, conferirLaudo, cumpreGarantia, faixaAdequada, lerGarantia, nivelDeSuficiencia,
  podeEmitir, textoDaFaixa, textoDaGarantia, textoDaUnidade, textoDoResultado,
} from './resultado';
import type { EntradaConferencia } from './resultado';
import type { FaixaLegenda } from '../types';

/* Os casos abaixo são os números dos laudos que o laboratório
   emitiu de verdade, com os defeitos que a revisão apontou. */

describe('textoDoResultado', () => {
  it('usa vírgula como separador, sempre', () => {
    expect(textoDoResultado(0.75, { casasDecimais: 2 })).toBe('0,75');
    expect(textoDoResultado(95.17, { casasDecimais: 2 })).toBe('95,17');
    expect(textoDoResultado(2566, { casasDecimais: 0 })).toBe('2.566');
  });

  /* O defeito: laudo 2649 traz "0.00" no S H2O e no Zn H2O, que não
     foram medidos como zero — ficaram abaixo do LQ. */
  it('abaixo do limite de quantificação sai "< LQ", não zero', () => {
    expect(textoDoResultado(0, { casasDecimais: 2, lq: 0.1 })).toBe('< 0,10');
    expect(textoDoResultado(0.04, { casasDecimais: 2, lq: 0.1 })).toBe('< 0,10');
    expect(textoDoResultado(0.0001, { casasDecimais: 4, lq: 0.001 })).toBe('< 0,0010');
  });

  it('no limite exato o resultado é reportável', () => {
    expect(textoDoResultado(0.1, { casasDecimais: 2, lq: 0.1 })).toBe('0,10');
  });

  it('sem LQ cadastrado, zero é zero', () => {
    expect(textoDoResultado(0, { casasDecimais: 2 })).toBe('0,00');
  });

  it('sem resultado não inventa número', () => {
    expect(textoDoResultado(undefined, { casasDecimais: 2, lq: 0.1 })).toBe('—');
    expect(textoDoResultado(Number.NaN, { casasDecimais: 2 })).toBe('—');
  });
});

describe('abaixoDoLq', () => {
  it('reconhece o que não pode ser reportado como número', () => {
    expect(abaixoDoLq(0, 0.1)).toBe(true);
    expect(abaixoDoLq(0.5, 0.1)).toBe(false);
    expect(abaixoDoLq(0.1, 0.1)).toBe(false);
  });

  it('sem LQ ou sem valor, não afirma nada', () => {
    expect(abaixoDoLq(0, undefined)).toBe(false);
    expect(abaixoDoLq(undefined, 0.1)).toBe(false);
  });
});

describe('textoDaUnidade', () => {
  /* O defeito: laudo 2649 imprime "%" na C/N, que é adimensional. */
  it('relação entre elementos não tem unidade', () => {
    expect(textoDaUnidade({ unidade: '%', ehRelacao: true })).toBe('--');
    expect(textoDaUnidade({ unidade: '', ehRelacao: true })).toBe('--');
  });

  it('ensaio comum mantém a sua', () => {
    expect(textoDaUnidade({ unidade: 'g/kg' })).toBe('g/kg');
    expect(textoDaUnidade({ unidade: 'mg/kg' })).toBe('mg/kg');
  });

  it('ensaio sem unidade sai com travessão', () => {
    expect(textoDaUnidade({ unidade: '' })).toBe('--');
    expect(textoDaUnidade({ unidade: '   ' })).toBe('--');
  });
});

describe('lerGarantia', () => {
  it('lê as três formas que aparecem no laudo de fertilizante', () => {
    expect(lerGarantia('95,00 Mín.')).toEqual({ valor: 95, tipo: 'minimo' });
    expect(lerGarantia('40,00 Máx.')).toEqual({ valor: 40, tipo: 'maximo' });
    expect(lerGarantia('12,5')).toEqual({ valor: 12.5, tipo: 'exato' });
  });

  it('não se perde com acento, caixa ou ponto final', () => {
    expect(lerGarantia('5,00 MAX')?.tipo).toBe('maximo');
    expect(lerGarantia('5,00 min.')?.tipo).toBe('minimo');
    expect(lerGarantia('5,00 Mínimo')?.tipo).toBe('minimo');
  });

  it('entende milhar com ponto e decimal com vírgula', () => {
    expect(lerGarantia('1.234,56')?.valor).toBeCloseTo(1234.56, 10);
  });

  it('garantia em branco é ausência de garantia', () => {
    expect(lerGarantia('')).toBeUndefined();
    expect(lerGarantia('   ')).toBeUndefined();
    expect(lerGarantia(undefined)).toBeUndefined();
    expect(lerGarantia('Mín.')).toBeUndefined();
  });
});

describe('textoDaGarantia', () => {
  it('escreve de volta como o laudo mostra', () => {
    expect(textoDaGarantia({ valor: 95, tipo: 'minimo' }, 2)).toBe('95,00 Mín.');
    expect(textoDaGarantia({ valor: 40, tipo: 'maximo' }, 2)).toBe('40,00 Máx.');
    expect(textoDaGarantia({ valor: 12.5, tipo: 'exato' }, 2)).toBe('12,50');
    expect(textoDaGarantia(undefined, 2)).toBe('');
  });
});

describe('cumpreGarantia', () => {
  /* Do laudo 2573: granulometria # 004 garantia 95,00 Mín., resultado
     95,17 — dentro; # 010 garantia 40,00 Máx., resultado 0,00 — dentro. */
  it('mínimo cobra piso', () => {
    expect(cumpreGarantia(95.17, { valor: 95, tipo: 'minimo' })).toBe(true);
    expect(cumpreGarantia(94.8, { valor: 95, tipo: 'minimo' })).toBe(false);
    expect(cumpreGarantia(95, { valor: 95, tipo: 'minimo' })).toBe(true);
  });

  it('máximo cobra teto', () => {
    expect(cumpreGarantia(0, { valor: 40, tipo: 'maximo' })).toBe(true);
    expect(cumpreGarantia(41, { valor: 40, tipo: 'maximo' })).toBe(false);
    expect(cumpreGarantia(40, { valor: 40, tipo: 'maximo' })).toBe(true);
  });

  it('garantia exata reprova o que fica abaixo', () => {
    expect(cumpreGarantia(19.8, { valor: 20, tipo: 'exato' })).toBe(false);
    expect(cumpreGarantia(20.4, { valor: 20, tipo: 'exato' })).toBe(true);
  });

  it('sem garantia declarada nada é reprovado', () => {
    expect(cumpreGarantia(1, undefined)).toBe(true);
    expect(cumpreGarantia(undefined, { valor: 20, tipo: 'minimo' })).toBe(true);
  });
});

describe('nivelDeSuficiencia', () => {
  /* Do laudo 2474, cacau: N adequado 20-25, resultado 23,34 (médio);
     K adequado 13-23, resultado 2,16 (baixo, bem abaixo). */
  it('dentro da faixa é médio', () => {
    const s = nivelDeSuficiencia(23.34, 20, 25)!;
    expect(s.nivel).toBe('medio');
    expect(s.posicao).toBeGreaterThan(1 / 3);
    expect(s.posicao).toBeLessThan(2 / 3);
  });

  it('abaixo do mínimo é baixo', () => {
    const s = nivelDeSuficiencia(2.16, 13, 23)!;
    expect(s.nivel).toBe('baixo');
    expect(s.posicao).toBeLessThanOrEqual(1 / 3);
  });

  it('acima do máximo é alto', () => {
    // Zn soja, laudo 2472: adequado 20-50, resultado 59,62
    const s = nivelDeSuficiencia(59.62, 20, 50)!;
    expect(s.nivel).toBe('alto');
    expect(s.posicao).toBeGreaterThanOrEqual(2 / 3);
  });

  it('o marcador anda dentro da faixa adequada', () => {
    const inicio = nivelDeSuficiencia(20.5, 20, 25)!.posicao;
    const meio = nivelDeSuficiencia(22.5, 20, 25)!.posicao;
    const fim = nivelDeSuficiencia(24.5, 20, 25)!.posicao;
    expect(inicio).toBeLessThan(meio);
    expect(meio).toBeLessThan(fim);
  });

  it('o marcador nunca sai da barra', () => {
    for (const v of [-100, 0, 1, 1000, 1e9]) {
      const s = nivelDeSuficiencia(v, 20, 25)!;
      expect(s.posicao).toBeGreaterThanOrEqual(0);
      expect(s.posicao).toBeLessThanOrEqual(1);
    }
  });

  /* Sem faixa cadastrada não há nível: foi imprimir mesmo assim que
     gerou "1-10" em todos os elementos do laudo de uva. */
  it('sem faixa cadastrada não inventa nível', () => {
    expect(nivelDeSuficiencia(23, undefined, 25)).toBeUndefined();
    expect(nivelDeSuficiencia(23, 20, undefined)).toBeUndefined();
    expect(nivelDeSuficiencia(undefined, 20, 25)).toBeUndefined();
  });

  it('faixa invertida ou degenerada não produz nível', () => {
    expect(nivelDeSuficiencia(23, 25, 20)).toBeUndefined();
    expect(nivelDeSuficiencia(23, 20, 20)).toBeUndefined();
  });
});

describe('textoDaFaixa', () => {
  it('escreve a faixa como o laudo mostra', () => {
    expect(textoDaFaixa(20, 25)).toBe('20-25');
    expect(textoDaFaixa(1.8, 2.5)).toBe('1,8-2,5');
    expect(textoDaFaixa(8, 12)).toBe('8-12');
  });

  /* Campo numérico em vez de texto livre: "2,,0-3,0" do laudo de
     laranja deixa de ser possível de escrever. */
  it('sem faixa, travessão — nunca um intervalo inventado', () => {
    expect(textoDaFaixa(undefined, undefined)).toBe('—');
    expect(textoDaFaixa(20, undefined)).toBe('—');
  });
});

describe('faixaAdequada', () => {
  const faixas: FaixaLegenda[] = [
    { ate: 20, rotulo: 'Baixo', severidade: 'critico' },
    { de: 20, ate: 25, rotulo: 'Adequado', severidade: 'ideal' },
    { de: 25, rotulo: 'Alto', severidade: 'atencao' },
  ];

  it('pega a faixa marcada como ideal', () => {
    expect(faixaAdequada(faixas)).toEqual({ minimo: 20, maximo: 25 });
  });

  it('legenda sem faixa ideal não tem adequada', () => {
    expect(faixaAdequada([{ ate: 20, rotulo: 'Baixo', severidade: 'critico' }])).toBeUndefined();
    expect(faixaAdequada(undefined)).toBeUndefined();
    expect(faixaAdequada([])).toBeUndefined();
  });

  it('faixa ideal sem limite nenhum não serve', () => {
    expect(faixaAdequada([{ rotulo: 'Adequado', severidade: 'ideal' }])).toBeUndefined();
  });
});

describe('conferirLaudo', () => {
  const item = (extra: Partial<EntradaConferencia['itens'][0]> = {}) => ({
    codigo: 'N', valor: 23.3, metodo: 'Kjeldahl', ...extra,
  });

  it('laudo completo não tem o que apontar', () => {
    const p = conferirLaudo({ itens: [item(), item({ codigo: 'P', valor: 2.1 })] });
    expect(p).toEqual([]);
    expect(podeEmitir(p)).toBe(true);
  });

  /* O laudo de uva: onze elementos, nenhuma faixa cadastrada para a
     cultura, e saiu assim mesmo com "1-10" em todos. */
  it('sem faixa da cultura, o laudo não sai', () => {
    const p = conferirLaudo({
      cultura: 'UVA',
      itens: ['N', 'P', 'K'].map((codigo) => item({ codigo, exigeFaixa: true })),
    });
    expect(podeEmitir(p)).toBe(false);
    expect(p[0].mensagem).toMatch(/UVA/);
    expect(p[0].onde).toBe('N, P, K');
  });

  it('faixa pela metade também impede', () => {
    const p = conferirLaudo({
      cultura: 'SOJA',
      itens: [item({ exigeFaixa: true, faixa: { minimo: 20 } })],
    });
    expect(podeEmitir(p)).toBe(false);
  });

  it('faixa invertida impede', () => {
    const p = conferirLaudo({
      cultura: 'SOJA',
      itens: [item({ exigeFaixa: true, faixa: { minimo: 25, maximo: 20 } })],
    });
    expect(podeEmitir(p)).toBe(false);
  });

  it('faixa completa libera', () => {
    const p = conferirLaudo({
      cultura: 'SOJA',
      itens: [item({ exigeFaixa: true, faixa: { minimo: 39, maximo: 54 } })],
    });
    expect(podeEmitir(p)).toBe(true);
  });

  /* O laudo analítico só imprime a faixa quando o modelo pede; num
     laudo de fertilizante a coluna nem existe. */
  it('ensaio que não imprime faixa não exige faixa', () => {
    const p = conferirLaudo({ itens: [item({ exigeFaixa: false })] });
    expect(podeEmitir(p)).toBe(true);
  });

  /* Método em branco apareceu em 3 ensaios do laudo 2649. Avisa,
     mas não impede: o laboratório pode ter razão para emitir. */
  it('método em branco avisa sem impedir', () => {
    const p = conferirLaudo({ itens: [item({ metodo: '' })] });
    expect(podeEmitir(p)).toBe(true);
    expect(p[0].gravidade).toBe('avisa');
    expect(p[0].mensagem).toMatch(/sem método/);
  });

  it('ensaio sem resultado avisa', () => {
    const p = conferirLaudo({ itens: [item({ valor: undefined })] });
    expect(p.some((x) => /sem resultado/.test(x.mensagem))).toBe(true);
    expect(podeEmitir(p)).toBe(true);
  });

  it('zero é resultado, não ausência', () => {
    const p = conferirLaudo({ itens: [item({ valor: 0 })] });
    expect(p).toEqual([]);
  });
});

describe('calcularRelacoes', () => {
  /* Os números do laudo 2474 (cacau, amostra 5177): N 23,34 g/kg,
     P 2,15 g/kg, K 2,16 g/kg, Cu 11,24 mg/kg, B 41,35 mg/kg. */
  const amostra = {
    N: { valor: 23.34, unidade: 'g/Kg' },
    P: { valor: 2.15, unidade: 'g/Kg' },
    K: { valor: 2.16, unidade: 'g/Kg' },
    CA: { valor: 9.12, unidade: 'g/Kg' },
    MG: { valor: 4.23, unidade: 'g/Kg' },
    S: { valor: 1.86, unidade: 'g/Kg' },
    B: { valor: 41.35, unidade: 'mg/Kg' },
    CU: { valor: 11.24, unidade: 'mg/Kg' },
    FE: { valor: 152.31, unidade: 'mg/Kg' },
    MN: { valor: 55.62, unidade: 'mg/Kg' },
    ZN: { valor: 35.25, unidade: 'mg/Kg' },
  };

  const valorDe = (nome: string) => calcularRelacoes(amostra).find((r) => r.nome === nome)?.valor;

  it('relação entre dois macronutrientes bate com o laudo', () => {
    // N/P = 23,34 / 2,15 = 10,86
    expect(valorDe('N/P')).toBeCloseTo(10.86, 2);
    expect(valorDe('N/K')).toBeCloseTo(10.81, 2);
    expect(valorDe('N/S')).toBeCloseTo(12.55, 2);
    expect(valorDe('N/Mg')).toBeCloseTo(5.52, 2);
    expect(valorDe('Ca/Mg')).toBeCloseTo(2.16, 2);
  });

  /* Relação entre unidades diferentes: o laboratório divide os
     números como foram reportados, sem converter. Dimensionalmente
     inconsistente, mas é o que os laudos dele trazem e o que as
     normas de referência que ele usa pressupõem. */
  it('divide os valores reportados, sem converter unidade', () => {
    expect(valorDe('N/Cu')).toBeCloseTo(2.08, 2);
    expect(valorDe('N/B')).toBeCloseTo(0.56, 2);
    expect(valorDe('P/Zn')).toBeCloseTo(0.06, 2);
    expect(valorDe('P/Cu')).toBeCloseTo(0.19, 2);
  });

  it('relação entre dois micronutrientes bate com o laudo', () => {
    expect(valorDe('Fe/Mn')).toBeCloseTo(2.74, 2);
    expect(valorDe('K/Mn')).toBeCloseTo(0.04, 2);
    expect(valorDe('Ca/Mn')).toBeCloseTo(0.16, 2);
  });

  it('entrega as quinze relações quando tudo foi analisado', () => {
    expect(calcularRelacoes(amostra)).toHaveLength(15);
  });

  it('relação com elemento não analisado não aparece', () => {
    const r = calcularRelacoes({ ...amostra, S: undefined });
    expect(r.find((x) => x.nome === 'N/S')).toBeUndefined();
    expect(r.find((x) => x.nome === 'N/P')).toBeDefined();
  });

  it('não divide por zero', () => {
    const r = calcularRelacoes({ ...amostra, MN: { valor: 0, unidade: 'mg/Kg' } });
    expect(r.find((x) => x.nome === 'Fe/Mn')).toBeUndefined();
  });

  it('a unidade não entra na conta', () => {
    const emPorcento = calcularRelacoes({
      N: { valor: 23.34, unidade: '%' },
      P: { valor: 2.15, unidade: '%' },
    });
    expect(emPorcento.find((x) => x.nome === 'N/P')?.valor).toBeCloseTo(10.86, 2);
  });

  it('amostra sem nada não produz relação', () => {
    expect(calcularRelacoes({})).toEqual([]);
  });
});
