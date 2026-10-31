import { describe, expect, it } from 'vitest';

import { ErroFormula, calcular, validarFormula } from './formula';

const v = (expressao: string, vars: Record<string, number | undefined> = {}) =>
  calcular(expressao, vars).valor;

describe('aritmética', () => {
  it('soma, subtrai, multiplica e divide', () => {
    expect(v('2 + 3')).toBe(5);
    expect(v('10 - 4')).toBe(6);
    expect(v('6 * 7')).toBe(42);
    expect(v('9 / 3')).toBe(3);
  });

  it('respeita a precedência', () => {
    expect(v('2 + 3 * 4')).toBe(14);
    expect(v('(2 + 3) * 4')).toBe(20);
    expect(v('2 * 3 + 4 * 5')).toBe(26);
  });

  it('potência associa à direita', () => {
    expect(v('2 ^ 3 ^ 2')).toBe(512);
    expect(v('(2 ^ 3) ^ 2')).toBe(64);
  });

  it('entende o menos unário', () => {
    expect(v('-5')).toBe(-5);
    expect(v('2 * -3')).toBe(-6);
    expect(v('-(2 + 3)')).toBe(-5);
    expect(v('10 - -5')).toBe(15);
    // Liga mais forte que a multiplicação, mais fraco que a potência.
    expect(v('-2 ^ 2')).toBe(-4);
    expect(v('(-2) ^ 2')).toBe(4);
  });

  it('aceita vírgula decimal, que é o que o laboratório digita', () => {
    expect(v('1,5 * 2')).toBe(3);
  });

  /* Infinity num laudo vira "∞ cmolc/dm³", que não é resultado. */
  it('divisão por zero não devolve infinito', () => {
    expect(v('5 / 0')).toBeNaN();
  });
});

describe('variáveis', () => {
  it('usa os resultados da amostra', () => {
    expect(v('CA + MG', { CA: 2.5, MG: 1.1 })).toBeCloseTo(3.6, 10);
  });

  it('o código pode ter sinal e hífen, como H+AL e P-MEL', () => {
    expect(v('H+AL * 2', { 'H+AL': 3 })).toBe(6);
    expect(v('P-MEL / 2', { 'P-MEL': 10 })).toBe(5);
  });

  it('não distingue maiúscula de minúscula no código', () => {
    expect(v('ca + mg', { CA: 1, MG: 2 })).toBe(3);
  });

  /* Zero é resultado válido; tratar ausência como zero daria uma CTC
     menor que a real sem ninguém perceber. */
  it('variável ausente não vira zero', () => {
    const r = calcular('CA + MG', { CA: 2 });
    expect(r.valor).toBeNaN();
    expect(r.faltando).toEqual(['MG']);
  });

  it('zero medido é usado como zero', () => {
    expect(calcular('CA + MG', { CA: 2, MG: 0 }).valor).toBe(2);
  });

  it('lista cada variável faltando uma só vez', () => {
    expect(calcular('MG + MG + CA', {}).faltando).toEqual(['MG', 'CA']);
  });
});

describe('funções', () => {
  it('min, max e abs', () => {
    expect(v('min(3; 7)')).toBe(3);
    expect(v('max(3; 7)')).toBe(7);
    expect(v('abs(0 - 4)')).toBe(4);
  });

  it('exp e ln', () => {
    expect(v('exp(0)')).toBe(1);
    expect(v('ln(1)')).toBe(0);
  });

  it('arred corta as casas do laudo', () => {
    expect(v('arred(3,14159; 2)')).toBeCloseTo(3.14, 10);
  });

  it('limite segura o valor na faixa', () => {
    expect(v('limite(140; 0; 100)')).toBe(100);
    expect(v('limite(-8; 0; 100)')).toBe(0);
    expect(v('limite(55; 0; 100)')).toBe(55);
  });

  it('se escolhe entre dois caminhos', () => {
    expect(v('se(1; 10; 20)')).toBe(10);
    expect(v('se(0; 10; 20)')).toBe(20);
  });

  it('funções aninhadas', () => {
    expect(v('max(min(5; 3); 1)')).toBe(3);
  });

  it('função com argumentos de menos é erro', () => {
    expect(() => calcular('min(3)', {})).toThrow(ErroFormula);
  });
});

/* ---- As contas que o laboratório realmente faz ---- */
describe('fórmulas de fertilidade', () => {
  const amostra = { CA: 2.4, MG: 0.9, K: 117, NA: 0.05, 'H+AL': 3.2, AL: 0.4, 'PH-SMP': 5.5 };

  it('SB — soma de bases, com o K convertido de mg/dm³', () => {
    const sb = calcular('CA + MG + K / 391 + NA', amostra).valor;
    expect(sb).toBeCloseTo(2.4 + 0.9 + 117 / 391 + 0.05, 10);
  });

  it('CTC a pH 7', () => {
    const ctc = calcular('CA + MG + K / 391 + NA + H+AL', amostra).valor;
    expect(ctc).toBeCloseTo(6.8492, 3);
  });

  it('V% — saturação por bases, limitada a 100', () => {
    const r = calcular('limite(100 * SB / CTC; 0; 100)', { SB: 3.65, CTC: 6.85 });
    expect(r.valor).toBeCloseTo(53.2846, 3);
  });

  it('m% — saturação por alumínio', () => {
    const r = calcular('100 * AL / (SB + AL)', { AL: 0.4, SB: 3.65 });
    expect(r.valor).toBeCloseTo(9.8765, 3);
  });

  /* CFSEMG: H+Al = exp(7,76 − 1,053 · SMP). É esta a conta que muda de
     estado para estado, e a razão de a fórmula ser cadastro. */
  it('H+Al pelo índice SMP, na equação da CFSEMG', () => {
    const r = calcular('exp(7,76 - 1,053 * PH-SMP)', amostra);
    expect(r.valor).toBeCloseTo(Math.exp(7.76 - 1.053 * 5.5), 8);
  });

  it('a mesma conta com outro coeficiente dá outro resultado', () => {
    const minas = calcular('exp(7,76 - 1,053 * PH-SMP)', amostra).valor;
    const outro = calcular('exp(7,50 - 1,000 * PH-SMP)', amostra).valor;
    expect(outro).not.toBeCloseTo(minas, 3);
  });

  it('PRNT a partir de PN e RE', () => {
    expect(calcular('PN * RE / 100', { PN: 95, RE: 80 }).valor).toBeCloseTo(76, 10);
  });
});

describe('erros de escrita', () => {
  it('parêntese sem fechar', () => {
    expect(() => calcular('(2 + 3', {})).toThrow(/sem fechar/);
  });

  it('parêntese sem abrir', () => {
    expect(() => calcular('2 + 3)', {})).toThrow(/sem abrir/);
  });

  it('operando faltando', () => {
    expect(() => calcular('2 +', {})).toThrow(ErroFormula);
  });

  it('caractere que não existe na linguagem', () => {
    expect(() => calcular('2 $ 3', {})).toThrow(/inesperado/);
  });

  it('expressão vazia', () => {
    expect(() => calcular('   ', {})).toThrow(ErroFormula);
  });
});

describe('validarFormula', () => {
  const codigos = ['CA', 'MG', 'K', 'NA', 'H+AL', 'PH-SMP'];

  it('aprova fórmula correta sobre elementos cadastrados', () => {
    const r = validarFormula('CA + MG + K / 391', codigos);
    expect(r.ok).toBe(true);
    expect(r.variaveis).toEqual(['CA', 'MG', 'K']);
  });

  it('reprova elemento que não existe no cadastro', () => {
    const r = validarFormula('CA + XYZ', codigos);
    expect(r.ok).toBe(false);
    expect(r.desconhecidas).toEqual(['XYZ']);
    expect(r.erro).toMatch(/não cadastrado/);
  });

  it('reprova erro de sintaxe antes de salvar', () => {
    expect(validarFormula('CA + (MG', codigos).ok).toBe(false);
    expect(validarFormula('', codigos).ok).toBe(false);
  });

  it('não confunde função com elemento desconhecido', () => {
    const r = validarFormula('exp(7,76 - 1,053 * PH-SMP)', codigos);
    expect(r.ok).toBe(true);
    expect(r.variaveis).toEqual(['PH-SMP']);
  });
});

/* A fórmula vem do banco, e quem edita o cadastro não pode por isso
   rodar código na sessão de quem abre o laudo. */
describe('a fórmula não é JavaScript', () => {
  it.each([
    'process.exit(1)',
    'constructor.constructor("return 1")()',
    '[].map(alert)',
    '1; alert(1)',
  ])('recusa %s', (texto) => {
    expect(() => calcular(texto, {})).toThrow(ErroFormula);
  });

  /* Um identificador solto é variável, não acesso ao ambiente: a
     fórmula não tem como alcançar nada fora dos resultados da amostra. */
  it.each(['alert', 'globalThis', 'window'])('%s vira variável, e só', (nome) => {
    const r = calcular(nome, {});
    expect(r.valor).toBeNaN();
    expect(r.faltando).toEqual([nome.toUpperCase()]);
  });
});

describe('ou — ausência com valor combinado', () => {
  it('usa o valor medido quando ele existe', () => {
    expect(v('ou(NA; 0)', { NA: 0.05 })).toBeCloseTo(0.05, 10);
  });

  it('usa o padrão quando o elemento não foi analisado', () => {
    expect(v('ou(NA; 0)', {})).toBe(0);
  });

  /* O caso que motivou: SB sem sódio é Ca + Mg + K, e sem isso a
     cadeia inteira (SB → CTC → V%) parava na amostra que não pede Na. */
  it('SB sai mesmo sem sódio no escopo', () => {
    const r = calcular('CA + MG + K / 391 + ou(NA; 0)', { CA: 2.4, MG: 0.9, K: 117 });
    expect(r.valor).toBeCloseTo(2.4 + 0.9 + 117 / 391, 8);
  });

  it('com sódio, o resultado o inclui', () => {
    const r = calcular('CA + MG + K / 391 + ou(NA; 0)', { CA: 2.4, MG: 0.9, K: 117, NA: 0.05 });
    expect(r.valor).toBeCloseTo(2.4 + 0.9 + 117 / 391 + 0.05, 8);
  });

  /* A ausência continua sendo ausência onde ninguém combinou nada. */
  it('não muda o padrão do motor: fora de ou(), faltar ainda é NaN', () => {
    expect(calcular('CA + NA', { CA: 2.4 }).valor).toBeNaN();
  });
});
