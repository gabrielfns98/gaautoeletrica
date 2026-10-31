/* ============================================================
   BANCADA — recomendação de calagem, gessagem e adubação

   O laudo diz o que o solo tem. O cliente quer saber o que fazer
   com ele, e é por isso que ele mandou a amostra. Entre as duas
   coisas existe uma tabela de referência — e ela varia por estado,
   por cultura e por quem publicou.

   Nada aqui é constante de código: método, alvo e dose vêm do
   cadastro (`TabelaRecomendacao` + `RecomendacaoCultura`), porque
   a mesma amostra recomendada pelo CFSEMG e pelo Boletim 100 dá
   duas doses diferentes, e as duas estão certas na sua região.

   O módulo é deliberadamente explícito sobre o que falta: um solo
   sem CTC não tem calagem pelo método da saturação, e dizer isso
   é mais útil que devolver zero. Zero é uma recomendação — "não
   precisa de calcário" — e não pode sair de um dado ausente.
   ============================================================ */

import { numero, numeroAte } from './format';
import type {
  DosePorClasse, ItemSimples, MetodoCalagem, PontoSmp, RecomendacaoCultura,
  TabelaRecomendacao,
} from '../types';

/**
 * Compara nome de cultura sem depender de acento nem de caixa.
 *
 * A amostra guarda o nome ("Cana-de-açúcar") e o cadastro de
 * recomendação a chave ("CANA"): sem normalizar, seis das oito
 * culturas da demonstração saíam sem recomendação por causa de um
 * cedilha.
 */
const chave = (t: string) =>
  t.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();

/**
 * O código da cultura a partir do que a amostra guardou.
 *
 * A amostra pode trazer o código ou o nome — quem digitou na
 * recepção escolheu de uma lista, mas a importação de planilha
 * aceita o que vier. Os dois caminhos chegam ao mesmo cadastro.
 */
export function codigoDaCultura(
  culturas: ItemSimples[], texto: string | undefined,
): string | undefined {
  if (!texto?.trim()) return undefined;
  const alvo = chave(texto);
  const achada = culturas.find(
    (c) => chave(c.codigo) === alvo || chave(c.nome) === alvo,
  );
  return achada?.codigo ?? texto;
}

/* ---------------- Entrada ---------------- */

/**
 * O solo como as contas precisam dele, já nas unidades das tabelas
 * publicadas. Converter é tarefa de `soloDosResultados`, não de
 * quem chama: a argila sai do laudo em g/kg e toda publicação de
 * recomendação a usa em %.
 */
export interface EntradaSolo {
  /** CTC a pH 7,0 (T), cmolc/dm³ */
  ctc?: number;
  /** saturação por bases (V), % */
  saturacaoBases?: number;
  /** alumínio trocável (Al³⁺), cmolc/dm³ */
  aluminio?: number;
  /** cálcio trocável, cmolc/dm³ */
  calcio?: number;
  /** magnésio trocável, cmolc/dm³ */
  magnesio?: number;
  /** índice SMP */
  indiceSmp?: number;
  /** fósforo disponível, mg/dm³ */
  fosforo?: number;
  /** potássio trocável, mg/dm³ */
  potassio?: number;
  /** argila, **%** — não g/kg */
  argila?: number;
  /** saturação por alumínio (m), % */
  saturacaoAluminio?: number;
}

/** Códigos de parâmetro que alimentam cada entrada, em ordem de preferência. */
const DE_PARA: Array<{ campo: keyof EntradaSolo; codigos: string[]; dividirPor?: number }> = [
  { campo: 'ctc', codigos: ['CTC'] },
  { campo: 'saturacaoBases', codigos: ['V'] },
  { campo: 'aluminio', codigos: ['AL'] },
  { campo: 'calcio', codigos: ['CA'] },
  { campo: 'magnesio', codigos: ['MG'] },
  { campo: 'indiceSmp', codigos: ['PH-SMP', 'SMP'] },
  /* Mehlich e resina medem o mesmo fósforo por extratores diferentes.
     A tabela de recomendação é escrita para um deles, mas quando o
     laboratório rodou o outro é melhor recomendar por ele que não
     recomendar — a tela diz qual extrator entrou. */
  { campo: 'fosforo', codigos: ['P-MEL', 'P-RES', 'P'] },
  { campo: 'potassio', codigos: ['K'] },
  /* g/kg no laudo, % na tabela: 450 g/kg é um solo de 45% de argila. */
  { campo: 'argila', codigos: ['ARG', 'ARGILA'], dividirPor: 10 },
  { campo: 'saturacaoAluminio', codigos: ['M'] },
];

export interface ResultadoBruto {
  codigo: string;
  valor?: number;
}

/**
 * Extrai a entrada a partir dos resultados do laudo.
 *
 * Casa por código de parâmetro, que é o que o cadastro garante ser
 * estável — o nome muda de laboratório para laboratório.
 */
export function soloDosResultados(resultados: ResultadoBruto[]): EntradaSolo {
  const porCodigo = new Map<string, number>();
  for (const r of resultados) {
    if (r.valor === undefined || !Number.isFinite(r.valor)) continue;
    porCodigo.set(r.codigo.trim().toUpperCase(), r.valor);
  }

  const solo: EntradaSolo = {};
  for (const { campo, codigos, dividirPor } of DE_PARA) {
    for (const codigo of codigos) {
      const valor = porCodigo.get(codigo);
      if (valor === undefined) continue;
      solo[campo] = dividirPor ? valor / dividirPor : valor;
      break;
    }
  }
  return solo;
}

/* ---------------- Calagem ---------------- */

export interface Calagem {
  metodo: MetodoCalagem;
  /**
   * t/ha do corretivo que o cliente vai comprar, já corrigido pelo
   * PRNT dele e pela profundidade de incorporação.
   */
  dose?: number;
  /** t/ha equivalente a calcário PRNT 100%, como a tabela publica */
  dosePrnt100?: number;
  prnt: number;
  profundidade: number;
  /** a conta, escrita, para o laudo poder mostrar como chegou lá */
  memoria?: string;
  /** o que faltou — quando não está vazio, não há dose */
  faltando: string[];
}

const PRNT_PADRAO = 85;

const num = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v);

/** Uma casa decimal: dose de calcário não se compra em grama. */
const t = (v: number) => Math.round(v * 10) / 10;

/**
 * Dose de calcário na curva SMP, interpolada entre os pontos
 * tabelados.
 *
 * Fora dos extremos a curva não é extrapolada: abaixo do primeiro
 * índice vale a dose do primeiro ponto (o solo é mais ácido do que
 * a tabela prevê, e extrapolar uma reta daria dose absurda), acima
 * do último vale a do último, que é zero.
 */
export function doseSmp(
  pontos: PontoSmp[], indice: number, phAlvo: number,
): number | undefined {
  if (pontos.length === 0 || !Number.isFinite(indice)) return undefined;

  // A publicação traz três colunas; o alvo pedido vai para a mais próxima.
  const coluna: keyof PontoSmp =
    Math.abs(phAlvo - 5.5) <= Math.abs(phAlvo - 6.0)
      ? 'ph55'
      : Math.abs(phAlvo - 6.0) <= Math.abs(phAlvo - 6.5) ? 'ph60' : 'ph65';

  const ordenados = [...pontos].sort((a, b) => a.indice - b.indice);

  /* Índice que está na tabela sai da tabela. Interpolar com fração
     1,0 reconstrói o mesmo ponto em ponto flutuante e devolve
     3,1999999999999993 onde a publicação diz 3,2 — e o que o laudo
     cita tem de ser o valor publicado. */
  const exato = ordenados.find((p) => p.indice === indice);
  if (exato) return exato[coluna];

  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  if (indice <= primeiro.indice) return primeiro[coluna];
  if (indice >= ultimo.indice) return ultimo[coluna];

  for (let i = 0; i < ordenados.length - 1; i += 1) {
    const a = ordenados[i];
    const b = ordenados[i + 1];
    if (indice < a.indice || indice > b.indice) continue;
    const vao = b.indice - a.indice;
    if (vao === 0) return a[coluna];
    const fracao = (indice - a.indice) / vao;
    return a[coluna] + (b[coluna] - a[coluna]) * fracao;
  }
  return undefined;
}

export interface OpcoesCalagem {
  /** PRNT do corretivo que o cliente tem disponível */
  prnt?: number;
  /** profundidade de incorporação pretendida, cm */
  profundidade?: number;
}

/**
 * Necessidade de calagem.
 *
 * Os três métodos dão a dose equivalente a PRNT 100% para a camada
 * que a tabela pressupõe. Dois ajustes vêm depois, e valem para
 * todos:
 *
 * - **PRNT** — a tabela publica para corretivo teórico de 100%; o
 *   que se compra tem 80 a 90, e a dose sobe na razão inversa.
 * - **Profundidade** — a dose vale para a camada incorporada pela
 *   tabela (20 cm, em geral). Incorporar a 30 cm é corrigir metade
 *   mais de solo, e exige metade mais de calcário.
 */
export function calcularCalagem(
  solo: EntradaSolo,
  tabela: TabelaRecomendacao,
  cultura: RecomendacaoCultura | undefined,
  opcoes: OpcoesCalagem = {},
): Calagem {
  const prnt = num(opcoes.prnt) && opcoes.prnt > 0 ? opcoes.prnt : PRNT_PADRAO;
  const profundidade = num(opcoes.profundidade) && opcoes.profundidade > 0
    ? opcoes.profundidade
    : tabela.profundidadeIncorporacao;
  const base = { metodo: tabela.metodoCalagem, prnt, profundidade };

  const faltando: string[] = [];
  if (!cultura) faltando.push('cultura sem recomendação cadastrada nesta tabela');

  let bruta: number | undefined;
  let memoria: string | undefined;

  if (tabela.metodoCalagem === 'saturacao-bases') {
    const v2 = cultura?.saturacaoDesejada;
    if (!num(solo.ctc)) faltando.push('CTC a pH 7,0');
    if (!num(solo.saturacaoBases)) faltando.push('saturação por bases (V%)');
    if (cultura && !num(v2)) faltando.push('V% desejado da cultura');
    if (num(solo.ctc) && num(solo.saturacaoBases) && num(v2)) {
      bruta = Math.max(0, (solo.ctc * (v2 - solo.saturacaoBases)) / 100);
      memoria = `NC = T · (V₂ − V₁) / 100 = ${numero(solo.ctc)} · `
        + `(${numero(v2, 0)} − ${numero(solo.saturacaoBases, 1)}) / 100`;
    }
  } else if (tabela.metodoCalagem === 'neutralizacao-al') {
    const y = cultura?.fatorAluminio;
    const x = cultura?.caMgDesejado;
    if (!num(solo.aluminio)) faltando.push('alumínio trocável');
    if (!num(solo.calcio)) faltando.push('cálcio trocável');
    if (!num(solo.magnesio)) faltando.push('magnésio trocável');
    if (cultura && !num(y)) faltando.push('coeficiente do alumínio');
    if (cultura && !num(x)) faltando.push('Ca+Mg desejado');
    if (num(solo.aluminio) && num(solo.calcio) && num(solo.magnesio) && num(y) && num(x)) {
      const caMg = solo.calcio + solo.magnesio;
      bruta = Math.max(0, y * solo.aluminio + Math.max(0, x - caMg));
      memoria = `NC = Y · Al³⁺ + [X − (Ca+Mg)] = ${numero(y, 1)} · ${numero(solo.aluminio)}`
        + ` + [${numero(x, 1)} − ${numero(caMg)}]`;
    }
  } else {
    const alvo = cultura?.phAlvo;
    if (!num(solo.indiceSmp)) faltando.push('índice SMP');
    if (!tabela.pontosSmp?.length) faltando.push('curva SMP da tabela');
    if (cultura && !num(alvo)) faltando.push('pH alvo da cultura');
    if (num(solo.indiceSmp) && tabela.pontosSmp?.length && num(alvo)) {
      bruta = doseSmp(tabela.pontosSmp, solo.indiceSmp, alvo);
      if (bruta !== undefined) {
        memoria = `Curva SMP ${tabela.codigo}: índice ${numero(solo.indiceSmp, 1)}`
          + ` → pH ${numero(alvo, 1)}`;
      }
    }
  }

  if (bruta === undefined) return { ...base, faltando };

  const fatorPrnt = 100 / prnt;
  const fatorProfundidade = profundidade / tabela.profundidadeIncorporacao;
  const dose = bruta * fatorPrnt * fatorProfundidade;

  const ajustes: string[] = [];
  if (prnt !== 100) ajustes.push(`PRNT ${numero(prnt, 0)}% (×${numero(fatorPrnt)})`);
  if (fatorProfundidade !== 1) {
    ajustes.push(
      `incorporação ${numero(profundidade, 0)} cm (×${numero(fatorProfundidade)})`,
    );
  }

  return {
    ...base,
    dosePrnt100: t(bruta),
    dose: t(dose),
    memoria: ajustes.length
      ? `${memoria} = ${numero(t(bruta), 1)} t/ha · ${ajustes.join(' · ')}`
      : memoria,
    faltando: [],
  };
}

/* ---------------- Gessagem ---------------- */

export interface Gessagem {
  indicado: boolean;
  /** kg/ha de gesso agrícola */
  dose?: number;
  motivo: string;
  faltando: string[];
}

/**
 * Necessidade de gesso agrícola, pelo critério do CFSEMG.
 *
 * O gesso não corrige acidez: ele carrega cálcio e sulfato para
 * baixo da camada arável, onde o calcário não chega. Por isso o
 * critério é lido na camada de 20–40 cm, e por isso recomendar
 * gesso a partir da amostra superficial é erro — a tela precisa
 * dizer de qual camada veio a amostra.
 *
 * NG (kg/ha) = 50 · argila(%), quando qualquer um dos três
 * impedimentos ao enraizamento aparece.
 */
export function calcularGessagem(solo: EntradaSolo): Gessagem {
  const faltando: string[] = [];
  if (!num(solo.argila)) faltando.push('argila');

  const criterios: string[] = [];
  if (num(solo.calcio) && solo.calcio < 0.5) {
    criterios.push(`Ca ${numero(solo.calcio)} < 0,5 cmolc/dm³`);
  }
  if (num(solo.saturacaoAluminio) && solo.saturacaoAluminio > 30) {
    criterios.push(`m ${numero(solo.saturacaoAluminio, 1)}% > 30%`);
  }
  if (num(solo.aluminio) && solo.aluminio > 0.5) {
    criterios.push(`Al³⁺ ${numero(solo.aluminio)} > 0,5 cmolc/dm³`);
  }

  if (!num(solo.calcio) && !num(solo.saturacaoAluminio) && !num(solo.aluminio)) {
    return {
      indicado: false,
      motivo: 'Sem Ca, Al³⁺ ou m% não há como avaliar impedimento em subsuperfície.',
      faltando: ['cálcio, alumínio ou saturação por alumínio'],
    };
  }

  if (criterios.length === 0) {
    return {
      indicado: false,
      motivo: 'Nenhum impedimento ao enraizamento em subsuperfície.',
      faltando: [],
    };
  }

  if (faltando.length > 0) {
    return { indicado: true, motivo: `Indicado por ${criterios.join(' e ')}.`, faltando };
  }

  return {
    indicado: true,
    dose: Math.round(50 * solo.argila!),
    motivo: `Indicado por ${criterios.join(' e ')}. NG = 50 · ${numero(solo.argila!, 0)}% de argila.`,
    faltando: [],
  };
}

/* ---------------- Adubação ---------------- */

export interface Adubacao {
  /** kg/ha de N */
  nitrogenio?: number;
  /** kg/ha de P₂O₅ */
  fosforo?: number;
  /** kg/ha de K₂O */
  potassio?: number;
  classeFosforo?: string;
  classePotassio?: string;
  /** produtividade usada no cálculo */
  produtividade?: number;
  unidadeProdutividade?: string;
  memoria: string[];
  faltando: string[];
}

/** Em qual classe de teor o valor caiu. `de` inclusivo, `ate` exclusivo. */
export function classeDe(
  classes: DosePorClasse[], valor: number,
): DosePorClasse | undefined {
  if (!Number.isFinite(valor)) return undefined;
  return classes.find(
    (c) => (c.de === undefined || valor >= c.de) && (c.ate === undefined || valor < c.ate),
  );
}

export interface OpcoesAdubacao {
  /** produtividade esperada; sem ela valem as doses de referência */
  produtividade?: number;
}

/**
 * Adubação de manutenção a partir do teor no solo.
 *
 * P e K saem da análise: o extrator mede o que a planta vai achar,
 * e a tabela converte o teor em dose. O nitrogênio não — nenhum
 * extrator mede N disponível de forma útil, porque ele mineraliza
 * ao longo da estação. Então o N vem da cultura e da produtividade
 * esperada, e é o único número aqui que não olha o laudo.
 *
 * Quando a produtividade esperada difere da referência da tabela,
 * as doses escalam proporcionalmente: é como as publicações
 * apresentam ("para cada tonelada adicional, mais x kg").
 */
export function calcularAdubacao(
  solo: EntradaSolo,
  cultura: RecomendacaoCultura | undefined,
  opcoes: OpcoesAdubacao = {},
): Adubacao {
  const memoria: string[] = [];
  const faltando: string[] = [];

  if (!cultura) {
    return { memoria, faltando: ['cultura sem recomendação cadastrada nesta tabela'] };
  }

  const referencia = cultura.produtividadeReferencia;
  const esperada = num(opcoes.produtividade) && opcoes.produtividade > 0
    ? opcoes.produtividade
    : referencia;
  const fator = num(referencia) && referencia > 0 && num(esperada) ? esperada / referencia : 1;
  if (fator !== 1 && num(esperada)) {
    memoria.push(
      (`Doses escaladas de ${numeroAte(referencia, 1)} para ${numeroAte(esperada, 1)} `
        + `${cultura.unidadeProdutividade ?? ''}`).trim()
      + ` (×${numero(fator)}).`,
    );
  }

  const escalar = (v: number) => Math.round(v * fator);

  let fosforo: number | undefined;
  let classeFosforo: string | undefined;
  if (!num(solo.fosforo)) {
    faltando.push('fósforo disponível');
  } else if (cultura.fosforo.length === 0) {
    faltando.push('classes de fósforo da cultura');
  } else {
    const classe = classeDe(cultura.fosforo, solo.fosforo);
    if (!classe) {
      faltando.push(`P ${numero(solo.fosforo, 1)} mg/dm³ fora das classes cadastradas`);
    } else {
      fosforo = escalar(classe.dose);
      classeFosforo = classe.classe;
      memoria.push(
        `P ${numero(solo.fosforo, 1)} mg/dm³ → ${classe.classe} → ${numero(fosforo, 0)} kg/ha de P₂O₅.`,
      );
    }
  }

  let potassio: number | undefined;
  let classePotassio: string | undefined;
  if (!num(solo.potassio)) {
    faltando.push('potássio trocável');
  } else if (cultura.potassio.length === 0) {
    faltando.push('classes de potássio da cultura');
  } else {
    const classe = classeDe(cultura.potassio, solo.potassio);
    if (!classe) {
      faltando.push(`K ${numero(solo.potassio, 1)} mg/dm³ fora das classes cadastradas`);
    } else {
      potassio = escalar(classe.dose);
      classePotassio = classe.classe;
      memoria.push(
        `K ${numero(solo.potassio, 1)} mg/dm³ → ${classe.classe} → ${numero(potassio, 0)} kg/ha de K₂O.`,
      );
    }
  }

  let nitrogenio: number | undefined;
  if (num(cultura.nitrogenio)) {
    nitrogenio = escalar(cultura.nitrogenio);
    memoria.push(`N ${numero(nitrogenio, 0)} kg/ha — da cultura, não da análise de solo.`);
  }

  return {
    nitrogenio,
    fosforo,
    potassio,
    classeFosforo,
    classePotassio,
    produtividade: num(esperada) ? esperada : undefined,
    unidadeProdutividade: cultura.unidadeProdutividade,
    memoria,
    faltando,
  };
}

/* ---------------- Entrada única ---------------- */

export interface Recomendacao {
  tabela: TabelaRecomendacao;
  cultura?: RecomendacaoCultura;
  calagem: Calagem;
  gessagem: Gessagem;
  adubacao: Adubacao;
  /**
   * true quando nada que venha da análise pôde ser calculado.
   *
   * O nitrogênio não conta: ele sai do cadastro da cultura e
   * sairia igual para qualquer amostra, até para uma que não teve
   * resultado nenhum. Um anexo só com N é uma folha a mais no
   * laudo dizendo "não calculado" em todo o resto — é o laudo
   * vazio outra vez, em outro lugar.
   */
  vazia: boolean;
}

export interface OpcoesRecomendacao extends OpcoesCalagem, OpcoesAdubacao {}

/**
 * A recomendação inteira para uma amostra.
 *
 * `cultura` é o código do cadastro de culturas. Sem cultura não há
 * alvo, e sem alvo não há dose — nenhum dos três métodos de calagem
 * recomenda algo em abstrato.
 */
export function recomendar(
  solo: EntradaSolo,
  tabela: TabelaRecomendacao,
  recomendacoes: RecomendacaoCultura[],
  cultura: string | undefined,
  opcoes: OpcoesRecomendacao = {},
): Recomendacao {
  const alvo = cultura ? chave(cultura) : undefined;
  const daCultura = recomendacoes.find(
    (r) => r.ativa && r.tabelaId === tabela.id && chave(r.cultura) === alvo,
  );

  const calagem = calcularCalagem(solo, tabela, daCultura, opcoes);
  const gessagem = calcularGessagem(solo);
  const adubacao = calcularAdubacao(solo, daCultura, opcoes);

  const vazia = calagem.dose === undefined
    && adubacao.fosforo === undefined
    && adubacao.potassio === undefined
    && gessagem.dose === undefined;

  return { tabela, cultura: daCultura, calagem, gessagem, adubacao, vazia };
}

/** Qual tabela usar quando o laboratório não escolheu uma. */
export function tabelaPadrao(
  tabelas: TabelaRecomendacao[], regiao?: string,
): TabelaRecomendacao | undefined {
  const ativas = tabelas.filter((t) => t.ativa);
  if (regiao) {
    const daRegiao = ativas.find(
      (t) => t.regiao.trim().toUpperCase() === regiao.trim().toUpperCase(),
    );
    if (daRegiao) return daRegiao;
  }
  return ativas.find((t) => t.padrao) ?? ativas[0];
}
