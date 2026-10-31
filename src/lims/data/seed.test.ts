/* ============================================================
   BANCADA — contratos dos dados de demonstração

   Um grupo de análise sem parâmetro gera amostra sem ensaio, e
   o laudo dessa amostra sai com a tabela de resultados vazia.
   Foi assim que o laudo em branco chegou à revisão do João, e
   é isto que estes testes impedem de voltar.
   ============================================================ */

import { describe, expect, it } from 'vitest';

import {
  amostras, culturas, ensaios, equipamentos, grupos, laudos, parametros,
  recomendacoesCultura, tabelasRecomendacao, tiposAnalise,
  tiposEquipamento, verificacoesEquipamento,
} from './seed';
import { deRecomendacaoCultura, paraRecomendacaoCultura } from './mapas';
import { recomendar, soloDosResultados } from '../lib/recomendacao';

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

describe('tabelas de recomendação', () => {
  it('toda recomendação aponta para uma tabela cadastrada', () => {
    const ids = new Set(tabelasRecomendacao.map((t) => t.id));
    const orfas = recomendacoesCultura.filter((r) => !ids.has(r.tabelaId)).map((r) => r.id);
    expect(orfas).toEqual([]);
  });

  /* Cultura que a recomendação cita e o cadastro não tem nunca é
     encontrada: a tela ofereceria a cultura e a dose sairia vazia. */
  it('toda cultura citada existe no cadastro de culturas', () => {
    const codigos = new Set(culturas.map((c) => c.codigo));
    const fora = [...new Set(recomendacoesCultura.map((r) => r.cultura))]
      .filter((c) => !codigos.has(c));
    expect(fora).toEqual([]);
  });

  it('cada método tem o alvo que o cálculo exige', () => {
    const porId = new Map(tabelasRecomendacao.map((t) => [t.id, t]));
    const sem: string[] = [];
    for (const r of recomendacoesCultura) {
      const metodo = porId.get(r.tabelaId)?.metodoCalagem;
      if (metodo === 'saturacao-bases' && r.saturacaoDesejada === undefined) sem.push(r.id);
      if (metodo === 'neutralizacao-al'
        && (r.fatorAluminio === undefined || r.caMgDesejado === undefined)) sem.push(r.id);
      if (metodo === 'smp' && r.phAlvo === undefined) sem.push(r.id);
    }
    expect(sem).toEqual([]);
  });

  it('tabela SMP traz a curva, e as outras não precisam dela', () => {
    for (const t of tabelasRecomendacao) {
      if (t.metodoCalagem === 'smp') expect(t.pontosSmp?.length ?? 0).toBeGreaterThan(5);
    }
  });

  it('a curva SMP é monótona: mais ácido pede mais calcário', () => {
    for (const t of tabelasRecomendacao.filter((x) => x.pontosSmp)) {
      const pontos = [...t.pontosSmp!].sort((a, b) => a.indice - b.indice);
      for (let i = 1; i < pontos.length; i += 1) {
        expect(pontos[i].ph55).toBeLessThanOrEqual(pontos[i - 1].ph55);
        expect(pontos[i].ph60).toBeLessThanOrEqual(pontos[i - 1].ph60);
      }
    }
  });

  /* Alvo mais alto exige mais corretivo; se a tabela saísse com as
     colunas trocadas, pH 6,5 pediria menos que pH 5,5. */
  it('na curva SMP, alvo mais alto pede dose maior', () => {
    for (const t of tabelasRecomendacao.filter((x) => x.pontosSmp)) {
      for (const p of t.pontosSmp!) {
        expect(p.ph60).toBeGreaterThanOrEqual(p.ph55);
        expect(p.ph65).toBeGreaterThanOrEqual(p.ph60);
      }
    }
  });

  it('as classes de P e K cobrem a faixa inteira, sem vão', () => {
    for (const r of recomendacoesCultura) {
      for (const classes of [r.fosforo, r.potassio]) {
        if (classes.length === 0) continue;
        expect(classes[0].de).toBeUndefined();
        expect(classes[classes.length - 1].ate).toBeUndefined();
        for (let i = 1; i < classes.length; i += 1) {
          expect(classes[i].de).toBe(classes[i - 1].ate);
        }
      }
    }
  });

  /* Teor maior no solo nunca pede mais adubo: se pedisse, a escada
     estaria invertida e o laudo recomendaria adubar o solo rico. */
  it('dose de P e K cai conforme o teor no solo sobe', () => {
    for (const r of recomendacoesCultura) {
      for (const classes of [r.fosforo, r.potassio]) {
        for (let i = 1; i < classes.length; i += 1) {
          expect(classes[i].dose).toBeLessThanOrEqual(classes[i - 1].dose);
        }
      }
    }
  });

  it('uma amostra de solo real produz recomendação completa', () => {
    const solo = soloDosResultados([
      { codigo: 'CTC', valor: 8.4 }, { codigo: 'V', valor: 42 },
      { codigo: 'P-MEL', valor: 12.3 }, { codigo: 'K', valor: 117 },
      { codigo: 'CA', valor: 2.4 }, { codigo: 'MG', valor: 0.9 },
      { codigo: 'AL', valor: 0.2 }, { codigo: 'ARG', valor: 450 },
    ]);
    const r = recomendar(solo, tabelasRecomendacao[0], recomendacoesCultura, 'SOJA');
    expect(r.calagem.dose).toBeGreaterThan(0);
    expect(r.adubacao.fosforo).toBeGreaterThan(0);
    expect(r.adubacao.potassio).toBeGreaterThan(0);
    expect(r.vazia).toBe(false);
  });
});

describe('ida e volta da recomendação pelo banco', () => {
  /* N zero é recomendação de verdade — a soja fixa o próprio
     nitrogênio. Um mapeador que tratasse 0 como ausente trocaria
     "não aplique N" por "não sabemos", e isso muda a adubação. */
  it('nitrogênio zero sobrevive ao mapeamento', () => {
    const soja = recomendacoesCultura.find((r) => r.nitrogenio === 0);
    expect(soja).toBeDefined();
    const volta = deRecomendacaoCultura(paraRecomendacaoCultura(soja!));
    expect(volta.nitrogenio).toBe(0);
  });

  it('a recomendação volta igual do banco', () => {
    for (const r of recomendacoesCultura) {
      expect(deRecomendacaoCultura(paraRecomendacaoCultura(r))).toEqual(r);
    }
  });
});
