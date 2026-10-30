import { describe, expect, it } from 'vitest';

import { faixaDe, fontesCitadas, interpretar, legendaDe } from './interpretacao';
import { legendas as legendasSeed, parametros } from '../data/seed';
import type { Legenda } from '../types';

const base: Omit<Legenda, 'id' | 'codigo' | 'nome' | 'faixas'> = {
  parametroId: 'par-x', fonte: 'Teste', padrao: true, ativa: true,
};

const trePontos: Legenda = {
  ...base,
  id: 'l1', codigo: 'L1', nome: 'Três faixas',
  faixas: [
    { ate: 10, rotulo: 'Baixo', severidade: 'critico' },
    { de: 10, ate: 20, rotulo: 'Médio', severidade: 'bom' },
    { de: 20, rotulo: 'Alto', severidade: 'ideal' },
  ],
};

describe('faixaDe', () => {
  it('coloca o valor na faixa cujo piso é inclusivo', () => {
    expect(faixaDe(10, trePontos)?.rotulo).toBe('Médio');
    expect(faixaDe(20, trePontos)?.rotulo).toBe('Alto');
  });

  it('o teto é exclusivo, então não sobra vão entre faixas', () => {
    expect(faixaDe(9.999, trePontos)?.rotulo).toBe('Baixo');
    expect(faixaDe(19.999, trePontos)?.rotulo).toBe('Médio');
  });

  it('cobre os extremos abertos', () => {
    expect(faixaDe(-5, trePontos)?.rotulo).toBe('Baixo');
    expect(faixaDe(1e6, trePontos)?.rotulo).toBe('Alto');
  });

  it('não interpreta sem legenda nem com valor inválido', () => {
    expect(faixaDe(10, undefined)).toBeUndefined();
    expect(faixaDe(Number.NaN, trePontos)).toBeUndefined();
  });
});

describe('legendaDe', () => {
  const daCultura: Legenda = { ...trePontos, id: 'l2', codigo: 'L2', nome: 'Soja', cultura: 'SOJA', padrao: false };
  const inativa: Legenda = { ...trePontos, id: 'l3', codigo: 'L3', nome: 'Velha', ativa: false };
  const todas = [inativa, trePontos, daCultura];

  it('prefere a legenda da cultura pedida', () => {
    expect(legendaDe(todas, 'par-x', 'SOJA')?.id).toBe('l2');
  });

  it('cai no padrão quando a cultura não tem legenda própria', () => {
    expect(legendaDe(todas, 'par-x', 'MILHO2')?.id).toBe('l1');
  });

  it('nunca usa legenda de cultura como padrão geral', () => {
    expect(legendaDe([daCultura], 'par-x')?.cultura).toBeUndefined();
  });

  it('ignora legenda inativa', () => {
    expect(legendaDe([inativa], 'par-x')).toBeUndefined();
  });

  it('não devolve legenda de outro parâmetro', () => {
    expect(legendaDe(todas, 'par-y')).toBeUndefined();
  });
});

describe('interpretar', () => {
  it('devolve faixa e legenda juntas', () => {
    const i = interpretar([trePontos], 'par-x', 25);
    expect(i?.faixa.rotulo).toBe('Alto');
    expect(i?.legenda.fonte).toBe('Teste');
  });

  it('ensaio sem valor não é interpretado', () => {
    expect(interpretar([trePontos], 'par-x', undefined)).toBeUndefined();
  });
});

describe('fontesCitadas', () => {
  it('lista cada referência uma vez, em ordem', () => {
    const a = interpretar([trePontos], 'par-x', 5);
    const outra: Legenda = { ...trePontos, id: 'l9', parametroId: 'par-z', fonte: 'Boletim 100' };
    const b = interpretar([outra], 'par-z', 5);
    expect(fontesCitadas([a, b, a, undefined])).toEqual(['Boletim 100', 'Teste']);
  });
});

/* As legendas que vão no produto precisam cobrir a faixa inteira:
   faixa com vão devolve "sem interpretação" para um resultado válido. */
describe('legendas do catálogo', () => {
  it('cada legenda cobre toda a reta sem vão nem sobreposição', () => {
    const problemas: string[] = [];
    for (const l of legendasSeed) {
      const fs = l.faixas;
      if (fs[0].de !== undefined) problemas.push(`${l.codigo}: primeira faixa tem piso`);
      if (fs[fs.length - 1].ate !== undefined) problemas.push(`${l.codigo}: última faixa tem teto`);
      for (let i = 1; i < fs.length; i += 1) {
        if (fs[i].de !== fs[i - 1].ate) {
          problemas.push(`${l.codigo}: ${fs[i - 1].ate} → ${fs[i].de}`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  it('cada legenda aponta para um parâmetro existente', () => {
    const ids = new Set(parametros.map((p) => p.id));
    expect(legendasSeed.filter((l) => !ids.has(l.parametroId)).map((l) => l.codigo)).toEqual([]);
  });

  it('nenhum parâmetro tem duas legendas padrão', () => {
    const contagem = new Map<string, number>();
    for (const l of legendasSeed) {
      if (!l.padrao || l.cultura) continue;
      contagem.set(l.parametroId, (contagem.get(l.parametroId) ?? 0) + 1);
    }
    expect([...contagem].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
  });
});
