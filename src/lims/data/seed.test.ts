/* ============================================================
   BANCADA — contratos dos dados de demonstração

   Um grupo de análise sem parâmetro gera amostra sem ensaio, e
   o laudo dessa amostra sai com a tabela de resultados vazia.
   Foi assim que o laudo em branco chegou à revisão do João, e
   é isto que estes testes impedem de voltar.
   ============================================================ */

import { describe, expect, it } from 'vitest';

import { amostras, ensaios, grupos, laudos, parametros, tiposAnalise } from './seed';

describe('grupos de análise', () => {
  it('todo grupo ativo tem ao menos um parâmetro', () => {
    const vazios = grupos
      .filter((g) => g.ativo)
      .filter((g) => !parametros.some((p) => p.grupoId === g.id))
      .map((g) => g.id);
    expect(vazios).toEqual([]);
  });

  it('todo grupo ativo tem ao menos um pacote vendável', () => {
    const vazios = grupos
      .filter((g) => g.ativo)
      .filter((g) => !tiposAnalise.some((t) => t.grupoId === g.id))
      .map((g) => g.id);
    expect(vazios).toEqual([]);
  });

  it('todo pacote aponta para parâmetros do próprio grupo', () => {
    const errados = tiposAnalise.flatMap((t) =>
      t.parametroIds
        .filter((id) => parametros.find((p) => p.id === id)?.grupoId !== t.grupoId)
        .map((id) => `${t.codigo} → ${id}`),
    );
    expect(errados).toEqual([]);
  });
});

describe('amostras', () => {
  it('nenhuma amostra fica sem ensaio', () => {
    const comEnsaio = new Set(ensaios.map((e) => e.amostraId));
    const sem = amostras.filter((a) => !comEnsaio.has(a.id)).map((a) => a.protocolo);
    expect(sem).toEqual([]);
  });

  it('todo ensaio aponta para um parâmetro existente', () => {
    const ids = new Set(parametros.map((p) => p.id));
    const orfaos = ensaios.filter((e) => !ids.has(e.parametroId)).map((e) => e.id);
    expect(orfaos).toEqual([]);
  });

  it('ensaio aprovado sempre tem valor', () => {
    const sem = ensaios
      .filter((e) => e.status === 'aprovado' && e.valor === undefined)
      .map((e) => e.id);
    expect(sem).toEqual([]);
  });
});

describe('laudos', () => {
  it('todo laudo tem amostras', () => {
    const vazios = laudos.filter((l) => l.amostraIds.length === 0).map((l) => l.numero);
    expect(vazios).toEqual([]);
  });

  /** O defeito original: laudo que renderiza só a lista de protocolos. */
  it('todo laudo emitido tem resultado aprovado para mostrar', () => {
    const porAmostra = new Map<string, number>();
    for (const e of ensaios) {
      if (e.status !== 'aprovado') continue;
      porAmostra.set(e.amostraId, (porAmostra.get(e.amostraId) ?? 0) + 1);
    }
    const vazios = laudos
      .filter((l) => l.status === 'emitido')
      .filter((l) => !l.amostraIds.some((id) => (porAmostra.get(id) ?? 0) > 0))
      .map((l) => l.numero);
    expect(vazios).toEqual([]);
  });
});
