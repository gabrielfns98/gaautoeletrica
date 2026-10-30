import { describe, expect, it } from 'vitest';

import { MODELO_PADRAO, modeloDoLaudo, montarLaudo, ordenarPeloModelo } from './montar';
import type { Amostra, Ensaio, Laudo, Legenda, ModeloLaudo, Parametro } from '../../types';

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

/* ---------------- Modelo do laudo ---------------- */

describe('modeloDoLaudo', () => {
  const base: ModeloLaudo = { ...MODELO_PADRAO, id: 'geral', nome: 'Geral' };
  const daUnidade: ModeloLaudo = { ...base, id: 'uni', unidadeId: 'un-1' };
  const doGrupo: ModeloLaudo = { ...base, id: 'grp', grupoId: 'solo' };
  const dosDois: ModeloLaudo = { ...base, id: 'ambos', unidadeId: 'un-1', grupoId: 'solo' };

  it('prefere o modelo da unidade e da análise', () => {
    expect(modeloDoLaudo([base, daUnidade, doGrupo, dosDois], 'un-1', 'solo').id).toBe('ambos');
  });

  it('cai para o da análise quando a unidade não tem o seu', () => {
    expect(modeloDoLaudo([base, doGrupo], 'un-9', 'solo').id).toBe('grp');
  });

  it('cai para o da unidade quando a análise não tem o seu', () => {
    expect(modeloDoLaudo([base, daUnidade], 'un-1', 'foliar').id).toBe('uni');
  });

  it('cai para o geral quando nada mais serve', () => {
    expect(modeloDoLaudo([base, daUnidade, doGrupo], 'un-9', 'foliar').id).toBe('geral');
  });

  it('não usa modelo de outra unidade nem de outra análise', () => {
    expect(modeloDoLaudo([daUnidade, doGrupo], 'un-9', 'foliar').id).toBe(MODELO_PADRAO.id);
  });

  it('ignora modelo inativo', () => {
    expect(modeloDoLaudo([{ ...dosDois, ativo: false }], 'un-1', 'solo').id).toBe(MODELO_PADRAO.id);
  });

  it('sem nenhum cadastrado, entrega o padrão do sistema', () => {
    expect(modeloDoLaudo([], 'un-1', 'solo').id).toBe(MODELO_PADRAO.id);
  });
});

describe('ordenarPeloModelo', () => {
  const p1 = par('p1', 'PH');
  const p2 = par('p2', 'MO');
  const p3 = par('p3', 'K');

  it('segue a ordem cadastrada', () => {
    const r = ordenarPeloModelo([p1, p2, p3], ['p3', 'p1', 'p2']);
    expect(r.map((p) => p.codigo)).toEqual(['K', 'PH', 'MO']);
  });

  /* Elemento novo no escopo não pode sumir do laudo só porque
     ninguém lembrou de acrescentá-lo ao modelo. */
  it('o que o modelo não lista vai depois, não some', () => {
    const r = ordenarPeloModelo([p1, p2, p3], ['p3']);
    expect(r.map((p) => p.codigo)).toEqual(['K', 'PH', 'MO']);
    expect(r).toHaveLength(3);
  });

  it('modelo sem ordem mantém a do cadastro', () => {
    expect(ordenarPeloModelo([p1, p2, p3], []).map((p) => p.codigo)).toEqual(['PH', 'MO', 'K']);
  });

  it('id que não está mais no escopo é ignorado', () => {
    const r = ordenarPeloModelo([p1, p2], ['p9', 'p2', 'p1']);
    expect(r.map((p) => p.codigo)).toEqual(['MO', 'PH']);
  });
});
