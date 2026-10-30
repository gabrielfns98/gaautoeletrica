import { describe, expect, it } from 'vitest';

import { montarLaudo } from './montar';
import type { Amostra, Ensaio, Laudo, Legenda, Parametro } from '../../types';

const par = (id: string, codigo: string, extra: Partial<Parametro> = {}): Parametro => ({
  id, codigo, nome: codigo, grupoId: 'solo', unidade: 'mg/dm³', tipo: 'numerico',
  metodo: `Método de ${codigo}`, casasDecimais: 1, preco: 10, ativo: true, ...extra,
});

const amostra = (id: string, protocolo: string): Amostra => ({
  id, protocolo, loteRecepcaoId: 'lote-1', clienteId: 'cli-1', grupoId: 'solo',
  unidadeId: 'uni-1', identificacaoCampo: `Campo ${protocolo}`,
  dataColeta: '2026-01-01T00:00:00.000Z', dataRecepcao: '2026-01-02T00:00:00.000Z',
  prazoEntrega: '2026-01-10T00:00:00.000Z', status: 'liberada', prioridade: 'normal',
  conformeNoRecebimento: true,
});

const ensaio = (id: string, amostraId: string, parametroId: string, extra: Partial<Ensaio> = {}): Ensaio => ({
  id, amostraId, parametroId, status: 'aprovado', unidade: 'mg/dm³', valor: 10, ...extra,
});

const laudo: Laudo = {
  id: 'lau-1', numero: 'LA-2026-00001', clienteId: 'cli-1',
  amostraIds: ['am-1', 'am-2'], grupoId: 'solo', status: 'emitido',
  versao: 1, enviadoEmail: false,
};

const legenda: Legenda = {
  id: 'leg-p', codigo: 'LEG-P', nome: 'Fósforo', parametroId: 'par-p',
  fonte: 'CFSEMG', padrao: true, ativa: true,
  faixas: [
    { ate: 16, rotulo: 'Baixo', severidade: 'atencao' },
    { de: 16, rotulo: 'Alto', severidade: 'ideal' },
  ],
};

const parametros = [par('par-p', 'P'), par('par-k', 'K')];
const amostrasBase = [amostra('am-1', '26.000101'), amostra('am-2', '26.000102')];

describe('montarLaudo', () => {
  it('agrupa os resultados aprovados por amostra', () => {
    const m = montarLaudo({
      laudo, amostras: amostrasBase, parametros, legendas: [legenda],
      ensaios: [
        ensaio('e1', 'am-1', 'par-p', { valor: 22 }),
        ensaio('e2', 'am-1', 'par-k', { valor: 80 }),
        ensaio('e3', 'am-2', 'par-p', { valor: 9 }),
      ],
    });
    expect(m.amostras.map((a) => a.resultados.length)).toEqual([2, 1]);
    expect(m.totalResultados).toBe(3);
  });

  /* O defeito que gerou o laudo em branco: tabela montada sobre
     ensaio não aprovado some inteira, sem a tela perceber. */
  it('não leva resultado que ainda não foi aprovado', () => {
    const m = montarLaudo({
      laudo, amostras: amostrasBase, parametros, legendas: [],
      ensaios: [
        ensaio('e1', 'am-1', 'par-p', { status: 'lido' }),
        ensaio('e2', 'am-1', 'par-k', { status: 'revisado' }),
      ],
    });
    expect(m.totalResultados).toBe(0);
    expect(m.parametros).toEqual([]);
  });

  it('ignora ensaio de amostra que não está no laudo', () => {
    const m = montarLaudo({
      laudo, amostras: [...amostrasBase, amostra('am-9', '26.000199')], parametros, legendas: [],
      ensaios: [ensaio('e1', 'am-9', 'par-p')],
    });
    expect(m.totalResultados).toBe(0);
    expect(m.amostras.map((a) => a.amostra.id)).toEqual(['am-1', 'am-2']);
  });

  it('ignora ensaio cujo parâmetro saiu do cadastro', () => {
    const m = montarLaudo({
      laudo, amostras: amostrasBase, parametros, legendas: [],
      ensaios: [ensaio('e1', 'am-1', 'par-sumiu')],
    });
    expect(m.totalResultados).toBe(0);
  });

  it('ordena as amostras por protocolo e os resultados pela ordem do cadastro', () => {
    const m = montarLaudo({
      laudo: { ...laudo, amostraIds: ['am-2', 'am-1'] },
      amostras: amostrasBase, parametros, legendas: [],
      ensaios: [
        ensaio('e1', 'am-1', 'par-k'),
        ensaio('e2', 'am-1', 'par-p'),
      ],
    });
    expect(m.amostras.map((a) => a.amostra.protocolo)).toEqual(['26.000101', '26.000102']);
    expect(m.amostras[0].resultados.map((r) => r.parametro.codigo)).toEqual(['P', 'K']);
  });

  it('só lista os parâmetros que realmente têm resultado', () => {
    const m = montarLaudo({
      laudo, amostras: amostrasBase, parametros, legendas: [],
      ensaios: [ensaio('e1', 'am-1', 'par-p')],
    });
    expect(m.parametros.map((p) => p.codigo)).toEqual(['P']);
  });

  it('interpreta cada resultado e cita a referência uma vez', () => {
    const m = montarLaudo({
      laudo, amostras: amostrasBase, parametros, legendas: [legenda],
      ensaios: [
        ensaio('e1', 'am-1', 'par-p', { valor: 22 }),
        ensaio('e2', 'am-2', 'par-p', { valor: 9 }),
        ensaio('e3', 'am-2', 'par-k', { valor: 80 }),
      ],
    });
    expect(m.amostras[0].resultados[0].interpretacao?.faixa.rotulo).toBe('Alto');
    expect(m.amostras[1].resultados[0].interpretacao?.faixa.rotulo).toBe('Baixo');
    // K não tem legenda cadastrada: fica sem interpretação, e isso é válido.
    expect(m.amostras[1].resultados[1].interpretacao).toBeUndefined();
    expect(m.fontes).toEqual(['CFSEMG']);
  });

  it('usa a legenda da cultura quando a amostra tem uma', () => {
    const daSoja: Legenda = {
      ...legenda, id: 'leg-p-soja', cultura: 'SOJA', padrao: false,
      faixas: [{ ate: 30, rotulo: 'Insuficiente para soja', severidade: 'critico' }, { de: 30, rotulo: 'Suficiente', severidade: 'ideal' }],
    };
    const m = montarLaudo({
      laudo, amostras: amostrasBase, parametros, legendas: [legenda, daSoja],
      ensaios: [ensaio('e1', 'am-1', 'par-p', { valor: 22 })],
      culturaDe: () => 'SOJA',
    });
    expect(m.amostras[0].resultados[0].interpretacao?.faixa.rotulo).toBe('Insuficiente para soja');
  });

  it('amostra sem nenhum resultado aprovado continua listada, vazia', () => {
    const m = montarLaudo({
      laudo, amostras: amostrasBase, parametros, legendas: [],
      ensaios: [ensaio('e1', 'am-1', 'par-p')],
    });
    expect(m.amostras[1].resultados).toEqual([]);
  });
});
