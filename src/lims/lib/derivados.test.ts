import { describe, expect, it } from 'vitest';

import { calcularDerivados, entradasDerivadas } from './formula';
import { hMaisAlPorSmp } from './ph';
import { formulas, parametros } from '../data/seed';

const codigo = (c: string) => parametros.find((p) => p.codigo === c)!;

/** Uma amostra de solo como a bancada entrega: só o que foi medido. */
const medidos = {
  CA: 2.4, MG: 0.9, K: 117, NA: 0.05, AL: 0.4, 'PH-SMP': 5.5,
};

const derivadosDoSolo = () => calcularDerivados(formulas, parametros, 'solo', medidos);

const valorDe = (c: string) => derivadosDoSolo().find((d) => d.codigo === c)?.valor;

describe('calcularDerivados', () => {
  /* V% depende de CTC, que depende de SB e de H+Al, que depende do
     índice SMP. Numa passagem só, V% sairia vazio. */
  it('resolve a cadeia inteira numa chamada', () => {
    const hal = hMaisAlPorSmp(5.5);
    const sb = 2.4 + 0.9 + 117 / 391 + 0.05;

    expect(valorDe('H+AL')).toBeCloseTo(hal, 6);
    expect(valorDe('SB')).toBeCloseTo(sb, 8);
    expect(valorDe('CTC')).toBeCloseTo(sb + hal, 6);
    expect(valorDe('V')).toBeCloseTo((sb / (sb + hal)) * 100, 6);
    expect(valorDe('M')).toBeCloseTo((0.4 / (sb + 0.4)) * 100, 6);
  });

  /* O H+Al cadastrado tem de dar o mesmo que a função que estava
     cravada no código, senão a troca mudou resultado de laudo. */
  it('a fórmula cadastrada reproduz a conta que estava no código', () => {
    for (const smp of [4.6, 5.0, 5.5, 6.2, 7.0]) {
      const pela = calcularDerivados(formulas, parametros, 'solo', { ...medidos, 'PH-SMP': smp })
        .find((d) => d.codigo === 'H+AL')!.valor;
      expect(pela).toBeCloseTo(hMaisAlPorSmp(smp), 6);
    }
  });

  it('V% não passa de 100 nem fica negativo', () => {
    const r = calcularDerivados(formulas, parametros, 'solo', {
      CA: 20, MG: 10, K: 400, NA: 1, AL: 0, 'PH-SMP': 7.2,
    });
    const v = r.find((d) => d.codigo === 'V')!.valor;
    expect(v).toBeLessThanOrEqual(100);
    expect(v).toBeGreaterThanOrEqual(0);
  });

  /* Sem o índice SMP não há H+Al, e sem H+Al não há CTC nem V%: eles
     ficam sem número em vez de sair errados. */
  it('o que depende do que faltou fica sem número, não errado', () => {
    const r = calcularDerivados(formulas, parametros, 'solo', { CA: 2.4, MG: 0.9, K: 117, NA: 0.05, AL: 0.4 });
    const porCodigo = new Map(r.map((d) => [d.codigo, d]));

    expect(porCodigo.get('SB')!.valor).toBeCloseTo(3.6492, 3);
    expect(porCodigo.get('H+AL')!.valor).toBeNaN();
    expect(porCodigo.get('H+AL')!.faltando).toEqual(['PH-SMP']);
    expect(porCodigo.get('CTC')!.valor).toBeNaN();
    expect(porCodigo.get('V')!.valor).toBeNaN();
  });

  it('só calcula parâmetro do grupo pedido', () => {
    const codigos = derivadosDoSolo().map((d) => d.codigo);
    expect(codigos).not.toContain('NDT');
    expect(calcularDerivados(formulas, parametros, 'bromatologia', { FDA: 30 })
      .map((d) => d.codigo)).toEqual(['NDT']);
  });

  it('fórmula inativa não entra na conta', () => {
    const codigos = calcularDerivados(formulas, parametros, 'corretivos-agricolas', { PN: 95, RE: 80 })
      .map((d) => d.codigo);
    expect(codigos).not.toContain('PRNT');
  });

  it('a fórmula do grupo vence a geral', () => {
    const geral = { id: 'f1', parametroId: codigo('CTC').id, expressao: '1', ativa: true };
    const doGrupo = { id: 'f2', parametroId: codigo('CTC').id, expressao: '2', grupoId: 'solo', ativa: true };
    const r = calcularDerivados([geral, doGrupo], parametros, 'solo', {});
    expect(r.find((d) => d.codigo === 'CTC')!.valor).toBe(2);
  });

  /* Um ciclo é erro de cadastro, mas não pode travar a tela. */
  it('ciclo entre fórmulas termina sem valor em vez de girar para sempre', () => {
    const a = { id: 'fa', parametroId: codigo('SB').id, expressao: 'CTC + 1', grupoId: 'solo', ativa: true };
    const b = { id: 'fb', parametroId: codigo('CTC').id, expressao: 'SB + 1', grupoId: 'solo', ativa: true };
    const r = calcularDerivados([a, b], parametros, 'solo', {});
    expect(r.every((d) => Number.isNaN(d.valor))).toBe(true);
  });

  it('erro de escrita na fórmula não derruba o cálculo dos outros', () => {
    const quebrada = { id: 'fx', parametroId: codigo('SB').id, expressao: 'CA + (', grupoId: 'solo', ativa: true };
    const boa = { id: 'fy', parametroId: codigo('CTC').id, expressao: '2 + 2', grupoId: 'solo', ativa: true };
    const r = calcularDerivados([quebrada, boa], parametros, 'solo', medidos);
    const porCodigo = new Map(r.map((d) => [d.codigo, d]));
    expect(porCodigo.get('SB')!.erro).toMatch(/sem fechar/);
    expect(porCodigo.get('CTC')!.valor).toBe(4);
  });
});

describe('fórmulas do catálogo', () => {
  it('toda fórmula aponta para um parâmetro existente', () => {
    const ids = new Set(parametros.map((p) => p.id));
    expect(formulas.filter((f) => !ids.has(f.parametroId)).map((f) => f.id)).toEqual([]);
  });

  it('toda fórmula ativa só usa elementos cadastrados do seu grupo', () => {
    const problemas: string[] = [];
    for (const f of formulas) {
      if (!f.ativa) continue;
      const alvo = parametros.find((p) => p.id === f.parametroId)!;
      const doGrupo = new Set(
        parametros.filter((p) => p.grupoId === alvo.grupoId).map((p) => p.codigo.toUpperCase()),
      );
      const r = calcularDerivados([f], parametros, alvo.grupoId, {});
      for (const v of r[0]?.faltando ?? []) {
        if (!doGrupo.has(v)) problemas.push(`${f.id}: ${v}`);
      }
      if (r[0]?.erro) problemas.push(`${f.id}: ${r[0].erro}`);
    }
    expect(problemas).toEqual([]);
  });
});

describe('relação C/N do laudo de fertilizante', () => {
  it('sai do carbono orgânico sobre o nitrogênio total', () => {
    const r = calcularDerivados(formulas, parametros, 'fertilizantes', {
      'CO-FERT': 4.68, 'N-TOT': 0.75,
    });
    // Laudo 2649: C.O. 4,68 e N total 0,75 dão C/N 6,24.
    expect(r.find((d) => d.codigo === 'REL-CN')?.valor).toBeCloseTo(6.24, 2);
  });

  /* Código com barra viraria divisão dentro de uma fórmula. */
  it('nenhum código de elemento tem barra', () => {
    expect(parametros.filter((p) => p.codigo.includes('/')).map((p) => p.codigo)).toEqual([]);
  });
});

/* ---------------- Lançamento ---------------- */

describe('entradasDerivadas', () => {
  const par = (codigo: string) => parametros.find((p) => p.codigo === codigo)!;

  /** Uma amostra de solo com um ensaio aberto para cada elemento. */
  const montar = (codigos: string[], valores: Record<string, number> = {}) => {
    const ensaios = codigos.map((c, i) => ({
      id: `e${i}`, amostraId: 'am-1', parametroId: par(c).id, valor: valores[c],
    }));
    return {
      ensaios,
      amostras: [{ id: 'am-1', grupoId: 'solo' }],
      parametros,
      formulas,
      idDe: (c: string) => ensaios.find((e) => e.parametroId === par(c).id)!.id,
    };
  };

  it('lançar Ca, Mg, K e Na faz a soma de bases sair junto', () => {
    const e = montar(['CA', 'MG', 'K', 'NA', 'SB']);
    const derivadas = entradasDerivadas([
      { ensaioId: e.idDe('CA'), valor: 2.4 },
      { ensaioId: e.idDe('MG'), valor: 0.9 },
      { ensaioId: e.idDe('K'), valor: 117 },
      { ensaioId: e.idDe('NA'), valor: 0.05 },
    ], e);

    const sb = derivadas.find((d) => d.ensaioId === e.idDe('SB'));
    expect(sb?.valor).toBeCloseTo(2.4 + 0.9 + 117 / 391 + 0.05, 8);
  });

  /* A cadeia inteira numa tacada: SB alimenta CTC, que alimenta V%. */
  it('resolve o que depende de outro calculado', () => {
    const e = montar(['CA', 'MG', 'K', 'NA', 'PH-SMP', 'AL', 'SB', 'CTC', 'V', 'M', 'H+AL']);
    const derivadas = entradasDerivadas([
      { ensaioId: e.idDe('CA'), valor: 2.4 },
      { ensaioId: e.idDe('MG'), valor: 0.9 },
      { ensaioId: e.idDe('K'), valor: 117 },
      { ensaioId: e.idDe('NA'), valor: 0.05 },
      { ensaioId: e.idDe('AL'), valor: 0.4 },
      { ensaioId: e.idDe('PH-SMP'), valor: 5.5 },
    ], e);

    const codigos = derivadas.map((d) =>
      e.ensaios.find((x) => x.id === d.ensaioId)!.parametroId);
    for (const c of ['H+AL', 'SB', 'CTC', 'V', 'M']) {
      expect(codigos).toContain(par(c).id);
    }
    const v = derivadas.find((d) => d.ensaioId === e.idDe('V'))!.valor;
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(100);
  });

  /* O escopo é decisão da recepção: lançar resultado não é hora de
     abrir ensaio que o cliente não contratou. */
  it('não inventa ensaio que não está no escopo da amostra', () => {
    const e = montar(['CA', 'MG', 'K', 'NA']); // sem SB no escopo
    const derivadas = entradasDerivadas([{ ensaioId: e.idDe('CA'), valor: 2.4 }], e);
    expect(derivadas).toEqual([]);
  });

  it('usa o valor que está sendo lançado, não o que estava gravado', () => {
    const e = montar(['CA', 'MG', 'K', 'NA', 'SB'], { CA: 1, MG: 0.9, K: 117, NA: 0.05 });
    const derivadas = entradasDerivadas([{ ensaioId: e.idDe('CA'), valor: 2.4 }], e);
    // Com o Ca novo (2,4) e não o antigo (1,0).
    expect(derivadas.find((d) => d.ensaioId === e.idDe('SB'))?.valor)
      .toBeCloseTo(2.4 + 0.9 + 117 / 391 + 0.05, 8);
  });

  it('não regrava calculado que não mudou', () => {
    const sb = 2.4 + 0.9 + 117 / 391 + 0.05;
    const e = montar(['CA', 'MG', 'K', 'NA', 'SB'], { CA: 2.4, MG: 0.9, K: 117, NA: 0.05, SB: sb });
    const derivadas = entradasDerivadas([{ ensaioId: e.idDe('CA'), valor: 2.4 }], e);
    expect(derivadas.find((d) => d.ensaioId === e.idDe('SB'))).toBeUndefined();
  });

  it('o próprio lote vence o calculado: analista que digita SB manda', () => {
    const e = montar(['CA', 'MG', 'K', 'NA', 'SB']);
    const derivadas = entradasDerivadas([
      { ensaioId: e.idDe('CA'), valor: 2.4 },
      { ensaioId: e.idDe('MG'), valor: 0.9 },
      { ensaioId: e.idDe('K'), valor: 117 },
      { ensaioId: e.idDe('NA'), valor: 0.05 },
      { ensaioId: e.idDe('SB'), valor: 99 },
    ], e);
    expect(derivadas.find((d) => d.ensaioId === e.idDe('SB'))).toBeUndefined();
  });

  it('faltando um elemento, o calculado não sai', () => {
    const e = montar(['CA', 'MG', 'SB']); // sem K nem Na
    const derivadas = entradasDerivadas([{ ensaioId: e.idDe('CA'), valor: 2.4 }], e);
    expect(derivadas).toEqual([]);
  });

  it('lote vazio não produz nada', () => {
    expect(entradasDerivadas([], montar(['CA', 'SB']))).toEqual([]);
  });

  it('não mexe em amostra que o lote não tocou', () => {
    const e = montar(['CA', 'MG', 'K', 'NA', 'SB']);
    const outra = {
      ...e,
      ensaios: [...e.ensaios, { id: 'z1', amostraId: 'am-2', parametroId: par('SB').id, valor: undefined }],
      amostras: [...e.amostras, { id: 'am-2', grupoId: 'solo' }],
    };
    const derivadas = entradasDerivadas([{ ensaioId: e.idDe('CA'), valor: 2.4 }], outra);
    expect(derivadas.find((d) => d.ensaioId === 'z1')).toBeUndefined();
  });
});

/* O defeito que apareceu digitando na grade: a amostra já tinha
   H+Al gravado de antes, e a CTC somou esse valor velho em vez de
   esperar o H+Al que estava sendo recalculado na mesma passagem. */
describe('calculado nunca parte do valor gravado', () => {
  it('recalcula a cadeia ignorando o derivado antigo da amostra', () => {
    const r = calcularDerivados(formulas, parametros, 'solo', {
      CA: 2.4, MG: 0.9, K: 117, AL: 0.4, 'PH-SMP': 5.5,
      // valores velhos, de um lançamento anterior
      'H+AL': 2.0, SB: 1.1, CTC: 3.1,
    });
    const de = (c: string) => r.find((x) => x.codigo === c)!.valor;

    const hal = Math.exp(7.76 - 1.053 * 5.5);
    const sb = 2.4 + 0.9 + 117 / 391;
    expect(de('H+AL')).toBeCloseTo(hal, 6);
    expect(de('SB')).toBeCloseTo(sb, 8);
    // A conta que saía errada: usava H+Al 2,0 e dava 5,6.
    expect(de('CTC')).toBeCloseTo(sb + hal, 6);
    expect(de('CTC')).toBeGreaterThan(10);
    expect(de('V')).toBeCloseTo((sb / (sb + hal)) * 100, 6);
  });

  it('elemento medido continua valendo como medido', () => {
    const r = calcularDerivados(formulas, parametros, 'solo', {
      CA: 2.4, MG: 0.9, K: 117, AL: 0.4, 'PH-SMP': 5.5,
    });
    // Ca não tem fórmula: entra na conta como foi medido.
    expect(r.find((x) => x.codigo === 'SB')!.valor).toBeCloseTo(2.4 + 0.9 + 117 / 391, 8);
  });
});
