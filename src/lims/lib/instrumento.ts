/* ============================================================
   BANCADA — o que o aparelho exporta, antes de virar tabela

   Cada marca exporta de um jeito, mas os desvios do CSV limpo são
   poucos e se repetem. Dois cobrem quase tudo que chega:

   1. A tabela vem embrulhada. Antes dela, o relatório do fabricante
      — nome do equipamento, método, operador, data; depois,
      estatísticas e "End of report". Lida como CSV, a primeira
      linha do preâmbulo vira cabeçalho e todas as colunas saem
      trocadas, sem erro nenhum na tela.

   2. A tabela é vertical. Em vez de uma linha por amostra, um bloco
      por amostra, com "elemento: valor" em cada linha. Lida como
      CSV, cada bloco vira várias linhas inúteis.

   Os dois se resolvem antes de `lerTabela`, sobre o texto.
   ============================================================ */

import { detectarSeparador, dividirEmLinhas } from './importacao';

/* ---------------- 1. Tabela embrulhada em relatório ---------------- */

export interface Recorte {
  /** o texto já sem preâmbulo nem rodapé */
  texto: string;
  linhasDescartadasNoInicio: number;
  linhasDescartadasNoFim: number;
  /** quantos campos tem a tabela encontrada */
  colunas: number;
}

/**
 * Acha a tabela dentro do relatório.
 *
 * O critério é a maior sequência de linhas seguidas com o mesmo
 * número de campos, desde que esse número seja maior que um. Um
 * preâmbulo é texto solto, que divide em um campo só ou em
 * quantidades irregulares; a tabela é regular, e é a maior coisa
 * regular do arquivo.
 *
 * Não mexe em arquivo que já é só tabela: aí a maior sequência é o
 * arquivo inteiro e nada é descartado.
 */
export function recortarRelatorio(conteudo: string): Recorte {
  const linhas = dividirEmLinhas(conteudo.replace(/^\uFEFF/, ''));
  if (linhas.length === 0) {
    return { texto: conteudo, linhasDescartadasNoInicio: 0, linhasDescartadasNoFim: 0, colunas: 0 };
  }

  const separador = detectarSeparador(linhas.filter((l) => l.trim() !== ''));
  const campos = linhas.map((l) =>
    (l.trim() === '' ? 0 : l.split(separador).length));

  let melhor = { inicio: 0, fim: -1, largura: 0 };
  let i = 0;
  while (i < campos.length) {
    const largura = campos[i];
    if (largura < 2) { i += 1; continue; }
    let j = i;
    while (j + 1 < campos.length && campos[j + 1] === largura) j += 1;
    const tamanho = j - i + 1;
    const melhorTamanho = melhor.fim - melhor.inicio + 1;
    /* Empate fica com o bloco mais largo: num relatório com duas
       sequências do mesmo tamanho, a tabela é a que tem mais colunas. */
    if (tamanho > melhorTamanho || (tamanho === melhorTamanho && largura > melhor.largura)) {
      melhor = { inicio: i, fim: j, largura };
    }
    i = j + 1;
  }

  if (melhor.fim < melhor.inicio) {
    return { texto: conteudo, linhasDescartadasNoInicio: 0, linhasDescartadasNoFim: 0, colunas: 0 };
  }

  return {
    texto: linhas.slice(melhor.inicio, melhor.fim + 1).join('\n'),
    linhasDescartadasNoInicio: melhor.inicio,
    linhasDescartadasNoFim: linhas.length - 1 - melhor.fim,
    colunas: melhor.largura,
  };
}

/* ---------------- 2. Um bloco por amostra ---------------- */

/** Rótulos que, num bloco, identificam a amostra em vez de um ensaio. */
const CHAVES_DE_AMOSTRA = [
  'sample', 'sampleid', 'sample id', 'amostra', 'id', 'identificacao',
  'identificação', 'protocolo', 'nome', 'name',
];

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

export interface Blocos {
  /** o texto convertido em CSV de uma linha por amostra */
  texto: string;
  amostras: number;
  campos: string[];
}

/**
 * Converte o formato vertical em tabela.
 *
 * Um bloco começa quando aparece de novo o rótulo que identifica a
 * amostra — não numa linha em branco, porque relatório de aparelho
 * tem linha em branco no meio do bloco tanto quanto entre blocos.
 *
 * Devolve `undefined` quando o texto não é desse formato: assim a
 * tela pode tentar o caminho normal sem precisar perguntar nada.
 */
export function lerBlocos(conteudo: string): Blocos | undefined {
  const linhas = dividirEmLinhas(conteudo.replace(/^\uFEFF/, ''))
    .map((l) => l.trim())
    .filter((l) => l !== '');

  const pares = linhas
    .map((l) => {
      const m = l.match(/^([^:=\t]{1,40})\s*[:=\t]\s*(.*)$/);
      return m ? { rotulo: m[1].trim(), valor: m[2].trim() } : undefined;
    });

  // Formato vertical é feito de pares; pouco par significa outro formato.
  const comPar = pares.filter(Boolean).length;
  if (comPar < linhas.length * 0.8 || comPar < 4) return undefined;

  const chaveDaAmostra = pares.find((p) => p && CHAVES_DE_AMOSTRA.includes(normalizar(p.rotulo)))?.rotulo;
  if (!chaveDaAmostra) return undefined;

  const blocos: Array<Record<string, string>> = [];
  let atual: Record<string, string> | undefined;

  for (const par of pares) {
    if (!par) continue;
    if (normalizar(par.rotulo) === normalizar(chaveDaAmostra)) {
      if (atual) blocos.push(atual);
      atual = { [chaveDaAmostra]: par.valor };
      continue;
    }
    if (!atual) continue;
    atual[par.rotulo] = par.valor;
  }
  if (atual) blocos.push(atual);
  if (blocos.length === 0) return undefined;

  /* As colunas são a união dos rótulos, na ordem em que apareceram:
     um bloco pode trazer um elemento que outro não traz. */
  const campos: string[] = [chaveDaAmostra];
  for (const bloco of blocos) {
    for (const k of Object.keys(bloco)) if (!campos.includes(k)) campos.push(k);
  }

  const escapar = (v: string) => (v.includes(';') ? `"${v.replace(/"/g, '""')}"` : v);
  const linhasCsv = [
    campos.join(';'),
    ...blocos.map((b) => campos.map((c) => escapar(b[c] ?? '')).join(';')),
  ];

  return { texto: linhasCsv.join('\n'), amostras: blocos.length, campos };
}

/* ---------------- Entrada única ---------------- */

export interface Preparado {
  texto: string;
  /** o que foi feito, para a tela dizer ao analista */
  notas: string[];
}

/**
 * Deixa o arquivo do aparelho no formato que `lerTabela` entende.
 *
 * Tenta o formato vertical primeiro: um relatório em blocos também
 * tem sequências regulares de linhas, e o recorte sozinho devolveria
 * um pedaço do bloco em vez da tabela inteira.
 */
export function prepararArquivo(conteudo: string): Preparado {
  const notas: string[] = [];

  const blocos = lerBlocos(conteudo);
  if (blocos) {
    notas.push(
      `Relatório em blocos: ${blocos.amostras} ${blocos.amostras === 1 ? 'amostra' : 'amostras'}, ` +
      `${blocos.campos.length - 1} ${blocos.campos.length === 2 ? 'ensaio' : 'ensaios'} por bloco.`,
    );
    return { texto: blocos.texto, notas };
  }

  const recorte = recortarRelatorio(conteudo);
  const { linhasDescartadasNoInicio: inicio, linhasDescartadasNoFim: fim } = recorte;
  if (inicio > 0 || fim > 0) {
    const partes: string[] = [];
    if (inicio > 0) partes.push(`${inicio} ${inicio === 1 ? 'linha' : 'linhas'} de cabeçalho do aparelho`);
    if (fim > 0) partes.push(`${fim} ${fim === 1 ? 'linha' : 'linhas'} de rodapé`);
    notas.push(`Ignorado: ${partes.join(' e ')}.`);
    return { texto: recorte.texto, notas };
  }

  return { texto: conteudo, notas };
}
