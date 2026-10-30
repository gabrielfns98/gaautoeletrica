import { describe, expect, it } from 'vitest';

import {
  avaliarVerificacao, erroPercentual, podeLer, situacaoMetrologica, vencimentoDaVerificacao,
} from './equipamento';
import type { Equipamento, TipoEquipamento, VerificacaoEquipamento } from '../types';

const AGORA = new Date('2026-06-15T12:00:00.000Z');

const dia = (n: number) => {
  const d = new Date(AGORA);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

const espectro: TipoEquipamento = {
  id: 'espectrofotometro', codigo: 'ESP', nome: 'Espectrofotômetro UV-Vis',
  grandeza: 'absorbância', exigeCurva: true, verificacao: 'curva-analitica',
  periodicidadeDias: 30, bloqueiaVencido: true, protocolos: ['generico-ascii'], ativo: true,
};

const estufa: TipoEquipamento = {
  ...espectro, id: 'estufa', codigo: 'EST', nome: 'Estufa',
  grandeza: 'temperatura', exigeCurva: false, verificacao: 'temperatura',
  periodicidadeDias: 90, bloqueiaVencido: false,
};

const agitador: TipoEquipamento = {
  ...estufa, id: 'agitador', codigo: 'AGI', nome: 'Agitador', verificacao: 'nenhuma',
};

const aparelho: Equipamento = {
  id: 'eq-1', tag: 'ESP-01', nome: 'Espectro', fabricante: 'X', modelo: 'Y',
  numeroSerie: 'Z', tipo: 'espectrofotometro', unidadeId: 'un-1', setor: 'FQ',
  ativo: true, dataAquisicao: dia(-800), proximaManutencao: dia(90),
};

const verificacao = (extra: Partial<VerificacaoEquipamento> = {}): VerificacaoEquipamento => ({
  id: 'ver-1', equipamentoId: 'eq-1', forma: 'curva-analitica', data: dia(-10),
  analistaId: 'usr-1', resultado: 'aprovada', validaAte: dia(20), ...extra,
});

describe('situacaoMetrologica', () => {
  it('sem registro, o aparelho conta como vencido', () => {
    const s = situacaoMetrologica('eq-1', [], AGORA);
    expect(s.semHistorico).toBe(true);
    expect(s.vencida).toBe(true);
  });

  it('dentro da validade não está vencida', () => {
    const s = situacaoMetrologica('eq-1', [verificacao()], AGORA);
    expect(s.vencida).toBe(false);
    expect(s.diasParaVencer).toBe(20);
  });

  it('passado o prazo, vencida com dias negativos', () => {
    const s = situacaoMetrologica('eq-1', [verificacao({ validaAte: dia(-3) })], AGORA);
    expect(s.vencida).toBe(true);
    expect(s.diasParaVencer).toBe(-3);
  });

  it('avisa quando falta pouco', () => {
    expect(situacaoMetrologica('eq-1', [verificacao({ validaAte: dia(5) })], AGORA).vencendo).toBe(true);
    expect(situacaoMetrologica('eq-1', [verificacao({ validaAte: dia(20) })], AGORA).vencendo).toBe(false);
  });

  /* Só a mais recente vale: uma aprovada depois de uma reprovada
     significa que o aparelho foi ajustado. */
  it('usa a verificação mais recente, não a pior', () => {
    const s = situacaoMetrologica('eq-1', [
      verificacao({ id: 'v-antiga', data: dia(-40), resultado: 'reprovada', validaAte: dia(-10) }),
      verificacao({ id: 'v-nova', data: dia(-2), resultado: 'aprovada', validaAte: dia(28) }),
    ], AGORA);
    expect(s.ultima?.id).toBe('v-nova');
    expect(s.reprovada).toBe(false);
    expect(s.vencida).toBe(false);
  });

  it('não confunde o histórico de outro aparelho', () => {
    const s = situacaoMetrologica('eq-1', [verificacao({ equipamentoId: 'eq-2' })], AGORA);
    expect(s.semHistorico).toBe(true);
  });
});

describe('podeLer', () => {
  it('libera aparelho verificado e no prazo', () => {
    expect(podeLer(aparelho, espectro, [verificacao()], AGORA).permitido).toBe(true);
  });

  it('bloqueia aparelho inativo', () => {
    const r = podeLer({ ...aparelho, ativo: false }, espectro, [verificacao()], AGORA);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/inativo/);
  });

  it('bloqueia verificação vencida quando o tipo exige', () => {
    const r = podeLer(aparelho, espectro, [verificacao({ validaAte: dia(-3) })], AGORA);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/venceu há 3/);
  });

  it('bloqueia aparelho que nunca foi verificado', () => {
    const r = podeLer(aparelho, espectro, [], AGORA);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/não tem verificação/);
  });

  /* O laboratório decide o bloqueio tipo a tipo: estufa vencida
     atrasa, espectro fora de calibração mente. */
  it('tipo que não bloqueia deixa ler mesmo vencido', () => {
    const r = podeLer(aparelho, estufa, [verificacao({ validaAte: dia(-30) })], AGORA);
    expect(r.permitido).toBe(true);
  });

  /* Reprovação não é configurável: aparelho que falhou não mede. */
  it('reprovação bloqueia mesmo em tipo que não bloqueia por vencimento', () => {
    const r = podeLer(aparelho, estufa, [verificacao({ resultado: 'reprovada' })], AGORA);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/reprovada/);
  });

  it('tipo sem verificação exigida nunca bloqueia', () => {
    expect(podeLer(aparelho, agitador, [], AGORA).permitido).toBe(true);
  });

  it('tipo não cadastrado não inventa bloqueio', () => {
    expect(podeLer(aparelho, undefined, [], AGORA).permitido).toBe(true);
  });

  it('alerta não bloqueia — o aparelho ainda passa', () => {
    expect(podeLer(aparelho, espectro, [verificacao({ resultado: 'alerta' })], AGORA).permitido).toBe(true);
  });
});

describe('erroPercentual', () => {
  it('é o desvio relativo ao padrão', () => {
    expect(erroPercentual(100, 102)).toBeCloseTo(2, 10);
    expect(erroPercentual(100, 97)).toBeCloseTo(-3, 10);
  });

  it('não divide por padrão zero', () => {
    expect(erroPercentual(0, 1)).toBeNaN();
  });
});

describe('avaliarVerificacao', () => {
  it('aprova dentro da metade da tolerância', () => {
    expect(avaliarVerificacao(1, 5)).toBe('aprovada');
  });

  it('alerta na metade de cima da tolerância', () => {
    expect(avaliarVerificacao(3, 5)).toBe('alerta');
    expect(avaliarVerificacao(-3, 5)).toBe('alerta');
  });

  it('reprova acima da tolerância', () => {
    expect(avaliarVerificacao(6, 5)).toBe('reprovada');
    expect(avaliarVerificacao(-6, 5)).toBe('reprovada');
  });

  it('erro no limite exato ainda passa', () => {
    expect(avaliarVerificacao(5, 5)).toBe('alerta');
  });

  it('erro que não é número reprova', () => {
    expect(avaliarVerificacao(Number.NaN, 5)).toBe('reprovada');
  });
});

describe('vencimentoDaVerificacao', () => {
  it('soma a periodicidade do tipo', () => {
    const v = vencimentoDaVerificacao(new Date('2026-06-15T12:00:00.000Z'), 30);
    expect(v.slice(0, 10)).toBe('2026-07-15');
  });
});
