import { describe, expect, it } from 'vitest';

import { aplicarModelo, modelosDoEquipamento, modeloDoMapeamento } from './importacao';
import type { ColunaLida } from './importacao';
import type { ModeloImportacao } from '../types';

const colunas = (...titulos: string[]): ColunaLida[] =>
  titulos.map((titulo, indice) => ({ indice, titulo, exemplos: [], numerica: false }));

const modelo = (extra: Partial<ModeloImportacao> = {}): ModeloImportacao => ({
  id: 'mod-1', nome: 'Genesys 150', fluxo: 'resultados', linhasIgnoradas: 0,
  temCabecalho: true, decimalVirgula: true, porTitulo: {}, ativo: true,
  data: '2026-01-01T00:00:00.000Z', ...extra,
});

describe('modeloDoMapeamento', () => {
  it('guarda pelo título quando há cabeçalho', () => {
    const m = modeloDoMapeamento(
      colunas('Sample ID', 'Abs 882nm'),
      { 0: 'protocolo', 1: 'par-p-mel' },
      true,
    );
    expect(m.porTitulo).toEqual({ sampleid: 'protocolo', abs882nm: 'par-p-mel' });
    expect(m.porIndice).toBeUndefined();
  });

  it('guarda pelo índice quando não há cabeçalho', () => {
    const m = modeloDoMapeamento(colunas('', ''), { 0: 'protocolo', 1: 'par-p-mel' }, false);
    expect(m.porIndice).toEqual({ 0: 'protocolo', 1: 'par-p-mel' });
    expect(m.porTitulo).toEqual({});
  });

  it('ignora coluna que o usuário deixou sem destino', () => {
    const m = modeloDoMapeamento(colunas('Sample ID', 'Lixo'), { 0: 'protocolo' }, true);
    expect(m.porTitulo).toEqual({ sampleid: 'protocolo' });
  });
});

describe('aplicarModelo', () => {
  const salvo = modelo({ porTitulo: { sampleid: 'protocolo', abs882nm: 'par-p-mel' } });

  it('casa as colunas do arquivo pelo título', () => {
    const r = aplicarModelo(salvo, colunas('Sample ID', 'Abs 882nm'));
    expect(r.mapa).toEqual({ 0: 'protocolo', 1: 'par-p-mel' });
    expect(r.ausentes).toEqual([]);
  });

  /* O ponto do modelo salvo: o aparelho troca a ordem das colunas
     entre versões de firmware, e um mapa preso ao índice passaria a
     gravar absorbância no campo de protocolo sem avisar. */
  it('sobrevive ao aparelho reordenar as colunas', () => {
    const r = aplicarModelo(salvo, colunas('Abs 882nm', 'Sample ID'));
    expect(r.mapa).toEqual({ 0: 'par-p-mel', 1: 'protocolo' });
    expect(r.ausentes).toEqual([]);
  });

  it('ignora diferença de acento, caixa e pontuação no título', () => {
    const comAcento = modelo({ porTitulo: { identificacao: 'protocolo' } });
    const r = aplicarModelo(comAcento, colunas('IDENTIFICAÇÃO'));
    expect(r.mapa).toEqual({ 0: 'protocolo' });
  });

  it('avisa o que o modelo esperava e o arquivo não trouxe', () => {
    const r = aplicarModelo(salvo, colunas('Sample ID'));
    expect(r.ausentes).toEqual(['par-p-mel']);
  });

  it('lista a coluna nova que o modelo não conhece', () => {
    const r = aplicarModelo(salvo, colunas('Sample ID', 'Abs 882nm', 'Abs 420nm'));
    expect(r.naoReconhecidas).toEqual(['Abs 420nm']);
    expect(r.mapa[2]).toBeUndefined();
  });

  it('coluna sem título não entra como não reconhecida', () => {
    const r = aplicarModelo(salvo, colunas('Sample ID', 'Abs 882nm', '   '));
    expect(r.naoReconhecidas).toEqual([]);
  });

  /* Sem cabeçalho o índice é tudo o que há, então ele vale — mas só
     nesse caso, nunca como atalho quando há títulos para casar. */
  it('usa o índice quando o modelo foi salvo sem cabeçalho', () => {
    const semTitulo = modelo({ porTitulo: {}, porIndice: { 0: 'protocolo', 1: 'par-p-mel' } });
    const r = aplicarModelo(semTitulo, colunas('', ''));
    expect(r.mapa).toEqual({ 0: 'protocolo', 1: 'par-p-mel' });
  });

  it('modelo por título não cai no índice quando o título não casa', () => {
    const comAmbos = modelo({ porTitulo: { sampleid: 'protocolo' }, porIndice: { 0: 'protocolo', 1: 'par-k' } });
    const r = aplicarModelo(comAmbos, colunas('Outro', 'Mais outro'));
    expect(r.mapa).toEqual({});
    expect(r.ausentes).toContain('protocolo');
  });
});

describe('modelosDoEquipamento', () => {
  const doAparelho = modelo({ id: 'm-eq', equipamentoId: 'eq-esp-01' });
  const daFamilia = modelo({ id: 'm-tipo', tipoEquipamentoId: 'espectrofotometro' });
  const geral = modelo({ id: 'm-geral' });
  const deOutro = modelo({ id: 'm-outro', equipamentoId: 'eq-aa-01' });
  const inativo = modelo({ id: 'm-inativo', equipamentoId: 'eq-esp-01', ativo: false });
  const outroFluxo = modelo({ id: 'm-amostras', fluxo: 'amostras', equipamentoId: 'eq-esp-01' });

  const todos = [geral, deOutro, daFamilia, doAparelho, inativo, outroFluxo];

  it('ordena do mais específico ao mais geral', () => {
    const r = modelosDoEquipamento(todos, 'eq-esp-01', 'espectrofotometro', 'resultados');
    expect(r.map((m) => m.id)).toEqual(['m-eq', 'm-tipo', 'm-geral']);
  });

  it('não oferece modelo de outro aparelho', () => {
    const r = modelosDoEquipamento(todos, 'eq-esp-01', 'espectrofotometro', 'resultados');
    expect(r.map((m) => m.id)).not.toContain('m-outro');
  });

  it('não oferece modelo inativo nem de outro fluxo', () => {
    const r = modelosDoEquipamento(todos, 'eq-esp-01', 'espectrofotometro', 'resultados');
    expect(r.map((m) => m.id)).not.toContain('m-inativo');
    expect(r.map((m) => m.id)).not.toContain('m-amostras');
  });

  it('sem equipamento escolhido só sobra o modelo geral', () => {
    const r = modelosDoEquipamento(todos, undefined, undefined, 'resultados');
    expect(r.map((m) => m.id)).toEqual(['m-geral']);
  });
});
