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
  programasProficiencia, recomendacoesCultura, resultadosProficiencia,
  rodadasProficiencia, tabelasRecomendacao, tiposAnalise,
  tiposEquipamento, verificacoesEquipamento,
} from './seed';
import { deRecomendacaoCultura, paraRecomendacaoCultura } from './mapas';
import { avaliarTendencia, calcularEscore } from '../lib/interlaboratorial';
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

describe('ensaio de proficiência', () => {
  const porId = new Map(parametros.map((p) => [p.id, p]));
  const rodadaPorId = new Map(rodadasProficiencia.map((r) => [r.id, r]));

  it('toda rodada aponta para um programa cadastrado', () => {
    const ids = new Set(programasProficiencia.map((p) => p.id));
    expect(rodadasProficiencia.filter((r) => !ids.has(r.programaId)).map((r) => r.id)).toEqual([]);
  });

  it('todo resultado aponta para rodada e parâmetro existentes', () => {
    const orfaos = resultadosProficiencia
      .filter((r) => !rodadaPorId.has(r.rodadaId) || !porId.has(r.parametroId))
      .map((r) => r.id);
    expect(orfaos).toEqual([]);
  });

  /* Designado sem σ entra na tela sem veredito e parece aprovado.
     O banco recusa; a semente não pode produzir o que o banco
     recusaria. */
  it('designado e desvio alvo andam juntos', () => {
    const quebrados = resultadosProficiencia
      .filter((r) => (r.designado === undefined) !== (r.desvioAlvo === undefined))
      .map((r) => r.id);
    expect(quebrados).toEqual([]);
  });

  it('só rodada avaliada tem valores designados', () => {
    for (const r of resultadosProficiencia) {
      const avaliada = rodadaPorId.get(r.rodadaId)?.status === 'avaliada';
      expect(r.designado !== undefined).toBe(avaliada);
    }
  });

  /* O banco impõe (programa, código) único. Semente que viola isso
     carrega bem na demonstração em memória e explode na primeira
     carga real — e o print da tela mostrava duas rodadas "2025/1"
     no mesmo programa. */
  it('o código da rodada é único dentro do programa', () => {
    const vistos = new Set<string>();
    const repetidos: string[] = [];
    for (const r of rodadasProficiencia) {
      const chave = `${r.programaId}|${r.codigo}`;
      if (vistos.has(chave)) repetidos.push(chave);
      vistos.add(chave);
    }
    expect(repetidos).toEqual([]);
  });

  it('cada rodada tem um ensaio por parâmetro, sem repetir', () => {
    for (const rodada of rodadasProficiencia) {
      const ids = resultadosProficiencia
        .filter((r) => r.rodadaId === rodada.id)
        .map((r) => r.parametroId);
      expect(ids.length).toBe(new Set(ids).size);
    }
  });

  it('as datas respeitam a ordem recebimento → envio → avaliação', () => {
    for (const r of rodadasProficiencia) {
      if (r.dataEnvio && r.dataRecebimento) expect(r.dataEnvio >= r.dataRecebimento).toBe(true);
      if (r.dataAvaliacao && r.dataEnvio) expect(r.dataAvaliacao >= r.dataEnvio).toBe(true);
      if (r.status === 'avaliada') expect(r.dataAvaliacao).toBeDefined();
    }
  });

  /* A demonstração existe para mostrar o recurso. Esta asserção já
     pegou a semente calada: o viés do potássio tinha sido posto nas
     duas rodadas que ainda não voltaram do organizador, e a tela
     anunciava "ensaios com viés: 0" com o viés plantado no lugar
     errado. */
  it('a demonstração exibe o viés sistemático do potássio', () => {
    const avaliadas = rodadasProficiencia
      .filter((r) => r.status === 'avaliada')
      .sort((a, b) => (a.dataRecebimento ?? '').localeCompare(b.dataRecebimento ?? ''));

    const potassio = parametros.find((p) => p.codigo === 'K' && p.grupoId === 'solo')!;
    const zs: number[] = [];
    for (const rodada of avaliadas) {
      const r = resultadosProficiencia.find(
        (x) => x.rodadaId === rodada.id && x.parametroId === potassio.id,
      );
      if (!r?.designado || !r.desvioAlvo) continue;
      const z = calcularEscore({
        valor: r.valor, designado: r.designado, desvioAlvo: r.desvioAlvo,
      }).z;
      if (z !== undefined) zs.push(z);
    }

    expect(zs.length).toBeGreaterThanOrEqual(3);
    expect(avaliarTendencia(zs).tendencia).toBe('tendencia-alta');
  });

  /* E a contrapartida: um ponto fora isolado não pode virar
     tendência, senão a tela acusaria viés em tudo. */
  it('o fósforo tem uma reprovação isolada, não tendência', () => {
    const avaliadas = rodadasProficiencia
      .filter((r) => r.status === 'avaliada')
      .sort((a, b) => (a.dataRecebimento ?? '').localeCompare(b.dataRecebimento ?? ''));

    const fosforo = parametros.find((p) => p.codigo === 'P-MEL')!;
    const zs: number[] = [];
    for (const rodada of avaliadas) {
      const r = resultadosProficiencia.find(
        (x) => x.rodadaId === rodada.id && x.parametroId === fosforo.id,
      );
      if (!r?.designado || !r.desvioAlvo) continue;
      const z = calcularEscore({
        valor: r.valor, designado: r.designado, desvioAlvo: r.desvioAlvo,
      }).z;
      if (z !== undefined) zs.push(z);
    }

    expect(zs.some((z) => Math.abs(z) >= 3)).toBe(true);
    expect(avaliarTendencia(zs).tendencia).toBe('estavel');
  });

  it('a reprovação do fósforo tem ação corretiva registrada', () => {
    const fosforo = parametros.find((p) => p.codigo === 'P-MEL')!;
    const comAcao = resultadosProficiencia.filter(
      (r) => r.parametroId === fosforo.id && r.acaoCorretiva,
    );
    expect(comAcao.length).toBeGreaterThan(0);
  });
});
