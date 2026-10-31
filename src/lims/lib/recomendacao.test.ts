import { describe, expect, it } from 'vitest';

import {
  calcularAdubacao, calcularCalagem, calcularGessagem, classeDe, codigoDaCultura,
  doseSmp, recomendar, soloDosResultados, tabelaPadrao,
} from './recomendacao';
import { necessidadeCalagem } from './ph';
import type { ItemSimples, RecomendacaoCultura, TabelaRecomendacao } from '../types';

/* ---------------- Tabelas de referência de teste ---------------- */

const CFSEMG: TabelaRecomendacao = {
  id: 'tab-v', codigo: 'CFSEMG-5A', nome: '5ª Aproximação', regiao: 'MG',
  fonte: 'CFSEMG (1999)', metodoCalagem: 'saturacao-bases',
  profundidadeIncorporacao: 20, padrao: true, ativa: true,
};

const CERRADO: TabelaRecomendacao = {
  id: 'tab-al', codigo: 'CERRADO', nome: 'Neutralização do alumínio', regiao: 'Cerrado',
  fonte: 'Embrapa Cerrados', metodoCalagem: 'neutralizacao-al',
  profundidadeIncorporacao: 20, padrao: false, ativa: true,
};

/* Pontos da curva oficial CQFS-RS/SC, abreviada. */
const SUL: TabelaRecomendacao = {
  id: 'tab-smp', codigo: 'CQFS-RS-SC', nome: 'Curva SMP', regiao: 'RS/SC',
  fonte: 'CQFS-RS/SC (2016)', metodoCalagem: 'smp',
  profundidadeIncorporacao: 20, padrao: false, ativa: true,
  pontosSmp: [
    { indice: 5.0, ph55: 10.0, ph60: 14.0, ph65: 18.0 },
    { indice: 6.0, ph55: 2.0, ph60: 3.2, ph65: 4.2 },
    { indice: 7.0, ph55: 0.0, ph60: 0.4, ph65: 0.9 },
  ],
};

const SOJA_V: RecomendacaoCultura = {
  id: 'rec-1', tabelaId: 'tab-v', cultura: 'SOJA',
  saturacaoDesejada: 70,
  produtividadeReferencia: 60, unidadeProdutividade: 'sc/ha',
  nitrogenio: 0,
  fosforo: [
    { ate: 10, dose: 120, classe: 'Baixo' },
    { de: 10, ate: 20, dose: 80, classe: 'Médio' },
    { de: 20, dose: 50, classe: 'Adequado' },
  ],
  potassio: [
    { ate: 40, dose: 100, classe: 'Baixo' },
    { de: 40, ate: 80, dose: 70, classe: 'Médio' },
    { de: 80, dose: 40, classe: 'Adequado' },
  ],
  ativa: true,
};

const SOJA_AL: RecomendacaoCultura = {
  id: 'rec-2', tabelaId: 'tab-al', cultura: 'SOJA',
  fatorAluminio: 2, caMgDesejado: 2,
  fosforo: [], potassio: [], ativa: true,
};

const SOJA_SMP: RecomendacaoCultura = {
  id: 'rec-3', tabelaId: 'tab-smp', cultura: 'SOJA',
  phAlvo: 6.0, fosforo: [], potassio: [], ativa: true,
};

/* ---------------- Entrada ---------------- */

describe('soloDosResultados', () => {
  it('casa os códigos do cadastro com os campos da conta', () => {
    const solo = soloDosResultados([
      { codigo: 'CTC', valor: 8.4 },
      { codigo: 'V', valor: 42.1 },
      { codigo: 'CA', valor: 2.4 },
      { codigo: 'P-MEL', valor: 12.3 },
      { codigo: 'K', valor: 117 },
    ]);
    expect(solo.ctc).toBe(8.4);
    expect(solo.saturacaoBases).toBe(42.1);
    expect(solo.calcio).toBe(2.4);
    expect(solo.fosforo).toBe(12.3);
    expect(solo.potassio).toBe(117);
  });

  /* O defeito que isto evita: a argila sai do laudo em g/kg e toda
     tabela de gessagem a usa em %. Sem converter, NG sai 10× maior
     e o cliente compra 22 toneladas de gesso em vez de 2,2. */
  it('converte argila de g/kg para %', () => {
    expect(soloDosResultados([{ codigo: 'ARG', valor: 450 }]).argila).toBe(45);
  });

  it('aceita o fósforo por resina quando não houve Mehlich', () => {
    expect(soloDosResultados([{ codigo: 'P-RES', valor: 31 }]).fosforo).toBe(31);
  });

  it('Mehlich tem precedência sobre resina', () => {
    const solo = soloDosResultados([
      { codigo: 'P-RES', valor: 31 },
      { codigo: 'P-MEL', valor: 12 },
    ]);
    expect(solo.fosforo).toBe(12);
  });

  it('resultado sem valor não entra', () => {
    expect(soloDosResultados([{ codigo: 'CTC' }]).ctc).toBeUndefined();
  });

  it('código em minúscula e com espaço ainda casa', () => {
    expect(soloDosResultados([{ codigo: ' ctc ', valor: 7 }]).ctc).toBe(7);
  });
});

/* ---------------- Curva SMP ---------------- */

describe('doseSmp', () => {
  it('interpola entre dois pontos tabelados', () => {
    expect(doseSmp(SUL.pontosSmp!, 5.5, 5.5)).toBeCloseTo(6.0, 10);
  });

  it('escolhe a coluna do pH alvo', () => {
    expect(doseSmp(SUL.pontosSmp!, 6.0, 5.5)).toBe(2.0);
    expect(doseSmp(SUL.pontosSmp!, 6.0, 6.0)).toBe(3.2);
    expect(doseSmp(SUL.pontosSmp!, 6.0, 6.5)).toBe(4.2);
  });

  it('pH alvo intermediário vai para a coluna mais próxima', () => {
    expect(doseSmp(SUL.pontosSmp!, 6.0, 5.7)).toBe(2.0);
    expect(doseSmp(SUL.pontosSmp!, 6.0, 5.9)).toBe(3.2);
  });

  /* Extrapolar a reta num solo mais ácido que a tabela daria dose
     absurda; o primeiro ponto é o teto. */
  it('não extrapola abaixo do primeiro índice', () => {
    expect(doseSmp(SUL.pontosSmp!, 4.0, 5.5)).toBe(10.0);
  });

  it('não extrapola acima do último índice', () => {
    expect(doseSmp(SUL.pontosSmp!, 8.0, 5.5)).toBe(0.0);
  });

  it('curva vazia não produz dose', () => {
    expect(doseSmp([], 6.0, 5.5)).toBeUndefined();
  });
});

/* ---------------- Calagem ---------------- */

describe('calcularCalagem — saturação por bases', () => {
  const solo = { ctc: 8, saturacaoBases: 40 };

  it('aplica NC = T·(V₂−V₁)/100 e corrige pelo PRNT', () => {
    const c = calcularCalagem(solo, CFSEMG, SOJA_V, { prnt: 85 });
    expect(c.dosePrnt100).toBe(2.4);
    expect(c.dose).toBe(2.8);          // 2,4 · 100/85 = 2,82
    expect(c.faltando).toEqual([]);
  });

  /* A fórmula já existia solta em ph.ts; as duas têm de concordar,
     senão o laudo e a bancada recomendam doses diferentes. */
  it('concorda com necessidadeCalagem de ph.ts', () => {
    const c = calcularCalagem(solo, CFSEMG, SOJA_V, { prnt: 85 });
    expect(c.dose).toBeCloseTo(necessidadeCalagem(8, 40, 70, 85), 1);
  });

  it('PRNT 100 não altera a dose publicada', () => {
    expect(calcularCalagem(solo, CFSEMG, SOJA_V, { prnt: 100 }).dose).toBe(2.4);
  });

  it('incorporar mais fundo exige mais corretivo', () => {
    const c = calcularCalagem(solo, CFSEMG, SOJA_V, { prnt: 100, profundidade: 30 });
    expect(c.dose).toBe(3.6);          // 2,4 · 30/20
    expect(c.memoria).toMatch(/incorporação 30 cm/);
  });

  it('V já acima do desejado dispensa calagem', () => {
    const c = calcularCalagem({ ctc: 8, saturacaoBases: 80 }, CFSEMG, SOJA_V, { prnt: 85 });
    expect(c.dose).toBe(0);
    expect(c.faltando).toEqual([]);
  });

  /* Dado ausente não é dose zero: zero recomenda não comprar
     calcário, e isso não pode sair de um CTC que ninguém mediu. */
  it('sem CTC não há dose, e diz o que falta', () => {
    const c = calcularCalagem({ saturacaoBases: 40 }, CFSEMG, SOJA_V);
    expect(c.dose).toBeUndefined();
    expect(c.faltando).toContain('CTC a pH 7,0');
  });

  it('sem cultura cadastrada não recomenda em abstrato', () => {
    const c = calcularCalagem(solo, CFSEMG, undefined);
    expect(c.dose).toBeUndefined();
    expect(c.faltando[0]).toMatch(/cultura/);
  });

  it('a memória de cálculo mostra a conta', () => {
    const c = calcularCalagem(solo, CFSEMG, SOJA_V, { prnt: 85 });
    expect(c.memoria).toMatch(/T · \(V₂ − V₁\)/);
    expect(c.memoria).toMatch(/PRNT 85%/);
  });

  it('PRNT ausente ou inválido cai no padrão de 85%', () => {
    expect(calcularCalagem(solo, CFSEMG, SOJA_V).prnt).toBe(85);
    expect(calcularCalagem(solo, CFSEMG, SOJA_V, { prnt: 0 }).prnt).toBe(85);
  });
});

describe('calcularCalagem — neutralização do alumínio', () => {
  it('soma a neutralização do Al à reposição de Ca+Mg', () => {
    const c = calcularCalagem(
      { aluminio: 0.8, calcio: 0.6, magnesio: 0.3 }, CERRADO, SOJA_AL, { prnt: 100 },
    );
    expect(c.dosePrnt100).toBe(2.7);   // 2·0,8 + (2 − 0,9)
  });

  it('Ca+Mg já suficiente deixa só a parcela do alumínio', () => {
    const c = calcularCalagem(
      { aluminio: 0.5, calcio: 2.0, magnesio: 1.0 }, CERRADO, SOJA_AL, { prnt: 100 },
    );
    expect(c.dosePrnt100).toBe(1.0);   // 2·0,5 + 0
  });

  it('solo sem alumínio e com bases suficientes dispensa calagem', () => {
    const c = calcularCalagem(
      { aluminio: 0, calcio: 2.5, magnesio: 1.2 }, CERRADO, SOJA_AL, { prnt: 100 },
    );
    expect(c.dose).toBe(0);
  });

  it('sem magnésio não há dose', () => {
    const c = calcularCalagem({ aluminio: 0.8, calcio: 0.6 }, CERRADO, SOJA_AL);
    expect(c.dose).toBeUndefined();
    expect(c.faltando).toContain('magnésio trocável');
  });
});

describe('calcularCalagem — SMP', () => {
  it('lê a dose na curva da tabela', () => {
    const c = calcularCalagem({ indiceSmp: 6.0 }, SUL, SOJA_SMP, { prnt: 100 });
    expect(c.dosePrnt100).toBe(3.2);
  });

  it('sem índice SMP não há dose', () => {
    const c = calcularCalagem({ ctc: 8, saturacaoBases: 40 }, SUL, SOJA_SMP);
    expect(c.dose).toBeUndefined();
    expect(c.faltando).toContain('índice SMP');
  });

  it('tabela SMP sem curva cadastrada avisa', () => {
    const semCurva = { ...SUL, pontosSmp: undefined };
    const c = calcularCalagem({ indiceSmp: 6.0 }, semCurva, SOJA_SMP);
    expect(c.faltando).toContain('curva SMP da tabela');
  });
});

/* ---------------- Gessagem ---------------- */

describe('calcularGessagem', () => {
  it('indica gesso por cálcio baixo e calcula NG = 50·argila%', () => {
    const g = calcularGessagem({ calcio: 0.3, argila: 45 });
    expect(g.indicado).toBe(true);
    expect(g.dose).toBe(2250);
    expect(g.motivo).toMatch(/Ca 0,30|Ca 0.30/);
  });

  it('indica por saturação por alumínio acima de 30%', () => {
    expect(calcularGessagem({ saturacaoAluminio: 42, argila: 30 }).indicado).toBe(true);
  });

  it('indica por alumínio trocável acima de 0,5', () => {
    expect(calcularGessagem({ aluminio: 0.9, argila: 30 }).indicado).toBe(true);
  });

  it('solo sem impedimento não leva gesso', () => {
    const g = calcularGessagem({ calcio: 2.4, aluminio: 0.1, saturacaoAluminio: 4, argila: 40 });
    expect(g.indicado).toBe(false);
    expect(g.dose).toBeUndefined();
  });

  /* Indicado e sem dose é um estado legítimo: o critério fechou,
     mas sem argila não há como dimensionar. */
  it('indicado sem argila fica sem dose e diz o que falta', () => {
    const g = calcularGessagem({ calcio: 0.3 });
    expect(g.indicado).toBe(true);
    expect(g.dose).toBeUndefined();
    expect(g.faltando).toContain('argila');
  });

  it('sem Ca, Al nem m% não avalia', () => {
    const g = calcularGessagem({ argila: 45 });
    expect(g.indicado).toBe(false);
    expect(g.faltando.length).toBeGreaterThan(0);
  });
});

/* ---------------- Adubação ---------------- */

describe('classeDe', () => {
  it('de é inclusivo e ate é exclusivo', () => {
    expect(classeDe(SOJA_V.fosforo, 10)!.classe).toBe('Médio');
    expect(classeDe(SOJA_V.fosforo, 9.9)!.classe).toBe('Baixo');
    expect(classeDe(SOJA_V.fosforo, 20)!.classe).toBe('Adequado');
  });

  it('classe sem teto pega qualquer valor alto', () => {
    expect(classeDe(SOJA_V.fosforo, 999)!.classe).toBe('Adequado');
  });
});

describe('calcularAdubacao', () => {
  it('converte o teor no solo em dose de P₂O₅ e K₂O', () => {
    const a = calcularAdubacao({ fosforo: 12, potassio: 117 }, SOJA_V);
    expect(a.fosforo).toBe(80);
    expect(a.classeFosforo).toBe('Médio');
    expect(a.potassio).toBe(40);
    expect(a.classePotassio).toBe('Adequado');
    expect(a.faltando).toEqual([]);
  });

  it('escala as doses pela produtividade esperada', () => {
    const a = calcularAdubacao({ fosforo: 12, potassio: 117 }, SOJA_V, { produtividade: 90 });
    expect(a.fosforo).toBe(120);       // 80 · 90/60
    expect(a.potassio).toBe(60);
    expect(a.memoria[0]).toBe('Doses escaladas de 60 para 90 sc/ha (×1,50).');
  });

  it('sem produtividade esperada valem as doses de referência', () => {
    const a = calcularAdubacao({ fosforo: 12, potassio: 117 }, SOJA_V);
    expect(a.produtividade).toBe(60);
    expect(a.fosforo).toBe(80);
  });

  /* O N é o único número da recomendação que não olha o laudo:
     nenhum extrator mede N disponível de forma útil. */
  it('o nitrogênio vem da cultura, não da análise', () => {
    const comN: RecomendacaoCultura = { ...SOJA_V, nitrogenio: 90 };
    const a = calcularAdubacao({}, comN);
    expect(a.nitrogenio).toBe(90);
    expect(a.memoria.some((m) => /não da análise de solo/.test(m))).toBe(true);
  });

  it('sem fósforo no laudo diz o que falta', () => {
    const a = calcularAdubacao({ potassio: 117 }, SOJA_V);
    expect(a.fosforo).toBeUndefined();
    expect(a.faltando).toContain('fósforo disponível');
  });

  it('cultura sem classes cadastradas avisa', () => {
    const a = calcularAdubacao({ fosforo: 12, potassio: 117 }, SOJA_AL);
    expect(a.faltando).toContain('classes de fósforo da cultura');
  });

  it('sem cultura não há adubação', () => {
    expect(calcularAdubacao({ fosforo: 12 }, undefined).faltando[0]).toMatch(/cultura/);
  });
});

/* ---------------- Entrada única ---------------- */

describe('recomendar', () => {
  const solo = { ctc: 8, saturacaoBases: 40, fosforo: 12, potassio: 117, calcio: 0.3, argila: 45 };

  it('junta calagem, gessagem e adubação da cultura pedida', () => {
    const r = recomendar(solo, CFSEMG, [SOJA_V, SOJA_AL], 'SOJA', { prnt: 85 });
    expect(r.cultura?.id).toBe('rec-1');
    expect(r.calagem.dose).toBe(2.8);
    expect(r.gessagem.dose).toBe(2250);
    expect(r.adubacao.fosforo).toBe(80);
    expect(r.vazia).toBe(false);
  });

  /* Recomendação de outra tabela não vale: cada publicação tem o
     seu alvo, e misturar os dois dá uma dose que não é de ninguém. */
  it('não usa a recomendação cadastrada para outra tabela', () => {
    const r = recomendar(solo, CFSEMG, [SOJA_AL], 'SOJA');
    expect(r.cultura).toBeUndefined();
    expect(r.calagem.dose).toBeUndefined();
  });

  it('cultura sem cadastro deixa a recomendação vazia', () => {
    const r = recomendar(solo, CFSEMG, [SOJA_V], 'ABACAXI');
    expect(r.calagem.dose).toBeUndefined();
    expect(r.adubacao.fosforo).toBeUndefined();
  });

  it('recomendação desativada não é usada', () => {
    const r = recomendar(solo, CFSEMG, [{ ...SOJA_V, ativa: false }], 'SOJA');
    expect(r.cultura).toBeUndefined();
  });

  it('cultura casa sem depender de caixa', () => {
    expect(recomendar(solo, CFSEMG, [SOJA_V], 'soja').cultura?.id).toBe('rec-1');
  });

  it('solo sem nada deixa a recomendação vazia', () => {
    expect(recomendar({}, CFSEMG, [SOJA_V], 'SOJA').vazia).toBe(true);
  });

  /* Duas coisas verdadeiras ao mesmo tempo, e foi confundi-las que
     fez o anexo desenhar folha em branco: N zero é recomendação de
     verdade — a soja fixa o próprio nitrogênio, e "não aplique N" é
     o que o agrônomo precisa ler — mas o N sai do cadastro da
     cultura, não do laudo, e sairia igual para uma amostra sem
     nenhum resultado. Então a dose existe e a recomendação continua
     vazia: não há o que anexar. */
  it('N existe mas não tira a recomendação do vazio', () => {
    const r = recomendar({}, CFSEMG, [SOJA_V], 'SOJA');
    expect(r.adubacao.nitrogenio).toBe(0);
    expect(r.vazia).toBe(true);
  });

  it('um resultado do solo já tira do vazio', () => {
    const r = recomendar({ fosforo: 12 }, CFSEMG, [SOJA_V], 'SOJA');
    expect(r.adubacao.fosforo).toBe(80);
    expect(r.vazia).toBe(false);
  });

  /* O pacote de granulometria mede argila e nada mais. Recomendar
     calagem a partir dele seria inventar; não anexar é o certo. */
  it('laudo só de granulometria não gera anexo', () => {
    expect(recomendar({ argila: 27.5 }, CFSEMG, [SOJA_V], 'SOJA').vazia).toBe(true);
  });
});

describe('tabelaPadrao', () => {
  const todas = [CFSEMG, CERRADO, SUL];

  it('a tabela da região vence a padrão', () => {
    expect(tabelaPadrao(todas, 'RS/SC')?.id).toBe('tab-smp');
  });

  it('sem região, vale a marcada como padrão', () => {
    expect(tabelaPadrao(todas)?.id).toBe('tab-v');
  });

  it('região sem tabela cai na padrão', () => {
    expect(tabelaPadrao(todas, 'AC')?.id).toBe('tab-v');
  });

  it('tabela desativada não é escolhida', () => {
    const r = tabelaPadrao([{ ...CFSEMG, ativa: false }, CERRADO]);
    expect(r?.id).toBe('tab-al');
  });

  it('sem tabela ativa não devolve nada', () => {
    expect(tabelaPadrao([{ ...CFSEMG, ativa: false }])).toBeUndefined();
  });
});

/* ---------------- Resolução da cultura ---------------- */

const CULTURAS: ItemSimples[] = [
  { id: 'c1', codigo: 'SOJA', nome: 'Soja', ativo: true },
  { id: 'c2', codigo: 'MILHO2', nome: 'Milho 2ª safra', ativo: true },
  { id: 'c3', codigo: 'CANA', nome: 'Cana-de-açúcar', ativo: true },
  { id: 'c4', codigo: 'CAFE', nome: 'Café', ativo: true },
  { id: 'c5', codigo: 'PASTO', nome: 'Pastagem', ativo: true },
  { id: 'c6', codigo: 'ALGODAO', nome: 'Algodão', ativo: true },
];

describe('codigoDaCultura', () => {
  /* O defeito que isto evita: a amostra guarda o nome da cultura e
     o cadastro de recomendação a chave. Sem resolver pelo cadastro,
     "Cana-de-açúcar" não encontra "CANA" e seis das oito culturas
     da demonstração saem sem recomendação nenhuma — por causa de
     um cedilha. */
  it('acha o código pelo nome, com acento e hífen', () => {
    expect(codigoDaCultura(CULTURAS, 'Cana-de-açúcar')).toBe('CANA');
    expect(codigoDaCultura(CULTURAS, 'Café')).toBe('CAFE');
    expect(codigoDaCultura(CULTURAS, 'Algodão')).toBe('ALGODAO');
    expect(codigoDaCultura(CULTURAS, 'Milho 2ª safra')).toBe('MILHO2');
    expect(codigoDaCultura(CULTURAS, 'Pastagem')).toBe('PASTO');
  });

  it('o próprio código também é aceito', () => {
    expect(codigoDaCultura(CULTURAS, 'CANA')).toBe('CANA');
    expect(codigoDaCultura(CULTURAS, 'cana')).toBe('CANA');
  });

  it('cultura fora do cadastro é devolvida como veio', () => {
    expect(codigoDaCultura(CULTURAS, 'Abacaxi')).toBe('Abacaxi');
  });

  it('vazio não resolve nada', () => {
    expect(codigoDaCultura(CULTURAS, undefined)).toBeUndefined();
    expect(codigoDaCultura(CULTURAS, '   ')).toBeUndefined();
  });
});

describe('recomendar — cultura com acento', () => {
  it('casa a cultura ignorando acento', () => {
    const comAcento: RecomendacaoCultura = { ...SOJA_V, cultura: 'CAFÉ' };
    const r = recomendar({ ctc: 8, saturacaoBases: 40 }, CFSEMG, [comAcento], 'CAFE');
    expect(r.cultura?.id).toBe('rec-1');
  });
});
