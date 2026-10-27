/* ============================================================
   BANCADA — leitura de planilha para importação
   O laboratório vive no Excel. Tudo que entra no sistema chega
   como arquivo ou colado da planilha, e este módulo trata disso
   antes de qualquer tela ver o dado.
   ============================================================ */

export type Separador = ';' | ',' | '\t' | '|';

export interface ColunaLida {
  indice: number;
  titulo: string;
  /** primeiros valores da coluna, para o usuário conferir o mapeamento */
  exemplos: string[];
  /** a coluna parece conter número em todas as linhas preenchidas */
  numerica: boolean;
}

export interface TabelaLida {
  separador: Separador;
  temCabecalho: boolean;
  /**
   * Quando o separador é vírgula, o decimal tem de ser ponto — senão
   * "5,42" seria duas células. Com ponto-e-vírgula ou tabulação, que é
   * o que o Excel em português gera, a vírgula é decimal.
   */
  decimalVirgula: boolean;
  colunas: ColunaLida[];
  linhas: string[][];
  avisos: string[];
}

/* ---------------- Divisão de linha respeitando aspas ---------------- */

function dividirLinha(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = '';
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      // aspas duplicadas dentro de campo entre aspas representam uma aspa
      if (dentroDeAspas && linha[i + 1] === '"') { atual += '"'; i++; }
      else dentroDeAspas = !dentroDeAspas;
    } else if (c === sep && !dentroDeAspas) {
      campos.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

/** Quebra em linhas sem cortar um campo entre aspas que contenha quebra. */
function dividirEmLinhas(texto: string): string[] {
  const linhas: string[] = [];
  let atual = '';
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"') {
      if (dentroDeAspas && texto[i + 1] === '"') { atual += '""'; i++; continue; }
      dentroDeAspas = !dentroDeAspas;
      atual += c;
    } else if ((c === '\n' || c === '\r') && !dentroDeAspas) {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linhas.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  if (atual !== '') linhas.push(atual);
  return linhas;
}

/* ---------------- Detecção ---------------- */

const SEPARADORES: Separador[] = [';', '\t', '|', ','];

/**
 * Escolhe o separador que produz o mesmo número de colunas na maioria
 * das linhas. Contar ocorrências não basta: um endereço com vírgulas
 * faria a vírgula vencer num arquivo separado por ponto-e-vírgula.
 */
export function detectarSeparador(linhas: string[]): Separador {
  const amostra = linhas.slice(0, 20).filter((l) => l.trim() !== '');
  if (amostra.length === 0) return ';';

  let melhor: Separador = ';';
  let melhorNota = -1;

  for (const sep of SEPARADORES) {
    const contagens = amostra.map((l) => dividirLinha(l, sep).length);
    const primeira = contagens[0];
    if (primeira < 2) continue;
    const consistentes = contagens.filter((c) => c === primeira).length;
    // premia consistência e, em empate, mais colunas
    const nota = consistentes * 100 + primeira;
    if (nota > melhorNota) { melhorNota = nota; melhor = sep; }
  }
  return melhor;
}

const ehNumero = (t: string) => t !== '' && /^-?[\d.,]+$/.test(t) && /\d/.test(t);

/**
 * Decide se a primeira linha é cabeçalho.
 *
 * O sinal forte é o corpo ter número onde o topo tem texto. Mas uma
 * relação de amostras costuma ser toda textual — "Ponto 1", "Serra Azul",
 * "T-01" — e aí esse sinal não existe. Nesse caso vale o segundo teste:
 * rótulo de coluna é único, nunca vazio, e não se repete como valor no
 * corpo da planilha.
 */
export function pareceCabecalho(primeira: string[], corpo: string[][]): boolean {
  const numerosNoTopo = primeira.filter(ehNumero).length;
  if (numerosNoTopo > primeira.length / 2) return false;

  const amostraCorpo = corpo.slice(0, 20);
  if (amostraCorpo.length === 0) return numerosNoTopo === 0;

  const numerosNoCorpo = Math.max(...amostraCorpo.map((l) => l.filter(ehNumero).length));
  if (numerosNoCorpo > numerosNoTopo) return true;

  const celulas = primeira.map((c) => c.trim());
  if (celulas.some((c) => c === '')) return false;
  if (new Set(celulas.map((c) => c.toLowerCase())).size !== celulas.length) return false;

  const valoresDoCorpo = new Set(
    amostraCorpo.flat().map((v) => v.trim().toLowerCase()).filter(Boolean),
  );
  return celulas.every((c) => !valoresDoCorpo.has(c.toLowerCase()));
}

export function lerTabela(conteudo: string): TabelaLida {
  const avisos: string[] = [];
  // o Excel grava BOM no CSV UTF-8
  const texto = conteudo.replace(/^\uFEFF/, '');

  const brutas = dividirEmLinhas(texto).filter((l) => l.trim() !== '');
  if (brutas.length === 0) {
    return { separador: ';', temCabecalho: false, decimalVirgula: true, colunas: [], linhas: [], avisos: ['Arquivo vazio.'] };
  }

  const separador = detectarSeparador(brutas);
  const decimalVirgula = separador !== ',';
  const todas = brutas.map((l) => dividirLinha(l, separador));

  const temCabecalho = pareceCabecalho(todas[0], todas.slice(1));
  const cabecalho = temCabecalho ? todas[0] : [];
  const linhas = temCabecalho ? todas.slice(1) : todas;

  const nColunas = Math.max(...todas.map((l) => l.length));
  const irregulares = todas.filter((l) => l.length !== nColunas).length;
  if (irregulares > 0) {
    avisos.push(`${irregulares} ${irregulares === 1 ? 'linha tem' : 'linhas têm'} número de colunas diferente do esperado (${nColunas}).`);
  }

  // normaliza o comprimento para a grade não ficar irregular na tela
  const normalizadas = linhas.map((l) =>
    l.length === nColunas ? l : [...l, ...Array(Math.max(0, nColunas - l.length)).fill('')].slice(0, nColunas));

  const colunas: ColunaLida[] = Array.from({ length: nColunas }, (_, i) => {
    const valores = normalizadas.map((l) => l[i] ?? '').filter((v) => v !== '');
    return {
      indice: i,
      titulo: (cabecalho[i] ?? '').trim() || `Coluna ${i + 1}`,
      exemplos: valores.slice(0, 3),
      numerica: valores.length > 0 && valores.every(ehNumero),
    };
  });

  if (!temCabecalho) avisos.push('Nenhum cabeçalho reconhecido — a primeira linha foi tratada como dado.');

  return { separador, temCabecalho, decimalVirgula, colunas, linhas: normalizadas, avisos };
}

/* ---------------- Conversão de valores ---------------- */

/**
 * Converte o texto da célula em número.
 * Aceita "1.234,56" e "1,234.56"; com separador vírgula, só ponto decimal.
 */
export function lerNumero(texto: string, decimalVirgula = true): number | undefined {
  const t = (texto ?? '').trim();
  if (t === '') return undefined;

  let limpo = t.replace(/\s/g, '');
  const temVirgula = limpo.includes(',');
  const temPonto = limpo.includes('.');

  if (temVirgula && temPonto) {
    // o último separador que aparece é o decimal
    limpo = limpo.lastIndexOf(',') > limpo.lastIndexOf('.')
      ? limpo.replace(/\./g, '').replace(',', '.')
      : limpo.replace(/,/g, '');
  } else if (temVirgula) {
    limpo = decimalVirgula
      ? limpo.replace(',', '.')
      // vírgula num arquivo separado por vírgula só pode ser milhar
      : limpo.replace(/,/g, '');
  }

  const v = Number(limpo);
  return Number.isFinite(v) ? v : undefined;
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa e aaaa-mm-dd. */
export function lerData(texto: string): string | undefined {
  const t = (texto ?? '').trim();
  if (t === '') return undefined;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).toISOString();

  const br = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(t);
  if (br) {
    const ano = Number(br[3]) < 100 ? 2000 + Number(br[3]) : Number(br[3]);
    const d = new Date(ano, Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

/* ---------------- Mapeamento de colunas ---------------- */

export interface AlvoMapeamento {
  campo: string;
  rotulo: string;
  /** termos que, achados no título da coluna, sugerem este campo */
  sinonimos: string[];
  obrigatorio?: boolean;
}

const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Sugere para onde vai cada coluna pelo título.
 * O usuário confirma na tela — isto é palpite, não decisão.
 */
export function sugerirMapeamento(
  colunas: ColunaLida[],
  alvos: AlvoMapeamento[],
): Record<number, string> {
  const mapa: Record<number, string> = {};
  const usados = new Set<string>();

  for (const coluna of colunas) {
    const titulo = normalizar(coluna.titulo);
    if (!titulo) continue;

    let melhor: AlvoMapeamento | undefined;
    let melhorNota = 0;

    for (const alvo of alvos) {
      if (usados.has(alvo.campo)) continue;
      for (const sin of alvo.sinonimos) {
        const s = normalizar(sin);
        if (!s) continue;
        // igualdade vale mais que conter, para "p" não casar com "profundidade"
        const nota = titulo === s ? 100 : titulo.includes(s) ? 50 + s.length : 0;
        if (nota > melhorNota) { melhorNota = nota; melhor = alvo; }
      }
    }

    if (melhor && melhorNota > 0) {
      mapa[coluna.indice] = melhor.campo;
      usados.add(melhor.campo);
    }
  }
  return mapa;
}

export const ALVOS_AMOSTRA: AlvoMapeamento[] = [
  { campo: 'identificacao', rotulo: 'Identificação de campo', obrigatorio: true,
    sinonimos: ['identificacao', 'identificação', 'amostra', 'id', 'descricao', 'descrição', 'nome'] },
  { campo: 'protocolo', rotulo: 'Protocolo', sinonimos: ['protocolo', 'codigo de barras', 'código de barras', 'numero', 'número', 'n amostra'] },
  { campo: 'propriedade', rotulo: 'Propriedade / fazenda', sinonimos: ['propriedade', 'fazenda', 'local'] },
  { campo: 'talhao', rotulo: 'Talhão', sinonimos: ['talhao', 'talhão', 'gleba', 'area', 'área'] },
  { campo: 'profundidade', rotulo: 'Profundidade', sinonimos: ['profundidade', 'camada', 'prof'] },
  { campo: 'cultura', rotulo: 'Cultura', sinonimos: ['cultura', 'cultivo'] },
  { campo: 'dataColeta', rotulo: 'Data de coleta', sinonimos: ['data de coleta', 'coleta', 'data'] },
  { campo: 'observacao', rotulo: 'Observação', sinonimos: ['observacao', 'observação', 'obs'] },
];

/* ---------------- Validação ---------------- */

export type SituacaoLinha = 'pronta' | 'alerta' | 'erro';

export interface LinhaValidada<T> {
  numero: number;
  dados: T;
  situacao: SituacaoLinha;
  mensagem?: string;
}

export function resumir<T>(linhas: Array<LinhaValidada<T>>) {
  return {
    total: linhas.length,
    prontas: linhas.filter((l) => l.situacao === 'pronta').length,
    alertas: linhas.filter((l) => l.situacao === 'alerta').length,
    erros: linhas.filter((l) => l.situacao === 'erro').length,
  };
}
