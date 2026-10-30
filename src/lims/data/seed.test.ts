/* ============================================================
   BANCADA — contratos dos dados de demonstração

   Um grupo de análise sem parâmetro gera amostra sem ensaio, e
   o laudo dessa amostra sai com a tabela de resultados vazia.
   Foi assim que o laudo em branco chegou à revisão do João, e
   é isto que estes testes impedem de voltar.
   ============================================================ */

import { describe, expect, it } from 'vitest';

import {
  amostras, ensaios, equipamentos, grupos, laudos, parametros, tiposAnalise,
  tiposEquipamento, verificacoesEquipamento,
} from './seed';

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

/* A revisão apontou datas no futuro em calibração, equipamentos e
   auditoria. O gerador recua dias a partir de hoje, e trocar o sinal
   de um deslocamento joga o evento para a frente sem ninguém notar —
   foi o que aconteceu com a verificação metrológica. */
describe('nada acontece no futuro', () => {
  const agora = Date.now();
  // Um dia de folga: a demonstração roda em qualquer fuso.
  const limite = agora + 24 * 60 * 60 * 1000;

  it('verificação de equipamento é evento passado', () => {
    const futuras = verificacoesEquipamento
      .filter((v) => +new Date(v.data) > limite)
      .map((v) => `${v.id} em ${v.data}`);
    expect(futuras).toEqual([]);
  });

  it('amostra não é recebida nem coletada no futuro', () => {
    const futuras = amostras
      .filter((a) => +new Date(a.dataRecepcao) > limite || +new Date(a.dataColeta) > limite)
      .map((a) => a.protocolo);
    expect(futuras).toEqual([]);
  });

  it('ensaio não é lido nem aprovado no futuro', () => {
    const futuros = ensaios
      .filter((e) => (e.dataLeitura && +new Date(e.dataLeitura) > limite)
        || (e.dataAprovacao && +new Date(e.dataAprovacao) > limite))
      .map((e) => e.id);
    expect(futuros).toEqual([]);
  });

  it('laudo não é emitido no futuro', () => {
    const futuros = laudos
      .filter((l) => l.emitidoEm && +new Date(l.emitidoEm) > limite)
      .map((l) => l.numero);
    expect(futuros).toEqual([]);
  });
});

describe('parque de equipamentos', () => {
  it('todo equipamento aponta para um tipo cadastrado', () => {
    const ids = new Set(tiposEquipamento.map((t) => t.id));
    expect(equipamentos.filter((e) => !ids.has(e.tipo)).map((e) => e.tag)).toEqual([]);
  });

  it('todo tipo que exige verificação tem periodicidade', () => {
    const sem = tiposEquipamento
      .filter((t) => t.verificacao !== 'nenhuma' && !(t.periodicidadeDias > 0))
      .map((t) => t.id);
    expect(sem).toEqual([]);
  });

  /* O potenciômetro tem trilha própria em `calibracoes`; todo o resto
     que gera resultado precisa de histórico de verificação, senão a
     tela mostra "nunca verificado" para um laboratório em operação. */
  it('aparelho que gera resultado tem histórico de verificação', () => {
    const porTipo = new Map(tiposEquipamento.map((t) => [t.id, t]));
    const comHistorico = new Set(verificacoesEquipamento.map((v) => v.equipamentoId));
    const sem = equipamentos
      .filter((e) => {
        const t = porTipo.get(e.tipo);
        return t && t.verificacao !== 'nenhuma' && t.verificacao !== 'calibracao-multiponto';
      })
      .filter((e) => !comHistorico.has(e.id))
      .map((e) => e.tag);
    expect(sem).toEqual([]);
  });
});
