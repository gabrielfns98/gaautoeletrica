/* ============================================================
   BANCADA — leitura de planilha do Excel
   Um .xlsx é um zip de XML. Descompactar e ler as poucas partes
   que interessam é determinístico, cabe em um arquivo e não
   arrasta uma biblioteca parada para dentro do produto.

   O que este leitor cobre: a primeira aba, texto compartilhado,
   texto embutido, número, booleano, erro de fórmula e data. O que
   não cobre: fórmula não calculada (o Excel grava o último valor,
   que é o que lemos), planilha protegida por senha e data anterior
   a 1900 — nenhuma delas aparece em planilha de laboratório.
   ============================================================ */

import { strFromU8, unzipSync } from 'fflate';

export interface PlanilhaLida {
  /** células já em texto, na ordem da planilha */
  matriz: string[][];
  /** nome da aba lida */
  aba: string;
  avisos: string[];
}

/* ---------------- XML sem DOM ---------------- */

const ENTIDADES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
};

function desescapar(texto: string): string {
  return texto
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (e) => ENTIDADES[e] ?? e);
}

function atributo(tag: string, nome: string): string | undefined {
  const m = new RegExp(`\\b${nome}="([^"]*)"`).exec(tag);
  return m ? m[1] : undefined;
}

/** Concatena o conteúdo de todas as tags <t> de um trecho. */
function textoDeT(trecho: string): string {
  let saida = '';
  for (const m of trecho.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) saida += desescapar(m[1]);
  return saida;
}

/* ---------------- partes do arquivo ---------------- */

function lerCompartilhadas(xml: string | undefined): string[] {
  if (!xml) return [];
  const itens: string[] = [];
  for (const m of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) itens.push(textoDeT(m[1]));
  return itens;
}

/** Formatos nativos do Excel que significam data ou hora. */
const FORMATOS_DATA = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function lerEstilosDeData(xml: string | undefined): Set<number> {
  const estilosData = new Set<number>();
  if (!xml) return estilosData;

  // Formatos personalizados que contêm dia, mês ou ano fora de literal.
  const personalizados = new Set<number>();
  for (const m of xml.matchAll(/<numFmt\b([^>]*)\/>/g)) {
    const id = Number(atributo(m[1], 'numFmtId'));
    const codigo = desescapar(atributo(m[1], 'formatCode') ?? '');
    const semLiteral = codigo.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '');
    if (Number.isFinite(id) && /[dmy]/i.test(semLiteral)) personalizados.add(id);
  }

  const bloco = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(xml);
  if (!bloco) return estilosData;

  let indice = 0;
  for (const m of bloco[1].matchAll(/<xf\b([^>]*?)(?:\/>|>[\s\S]*?<\/xf>)/g)) {
    const id = Number(atributo(m[1], 'numFmtId') ?? '0');
    if (FORMATOS_DATA.has(id) || personalizados.has(id)) estilosData.add(indice);
    indice += 1;
  }
  return estilosData;
}

/** Caminho da primeira aba, seguindo workbook.xml e seus relacionamentos. */
function caminhoDaPrimeiraAba(
  workbook: string | undefined, rels: string | undefined,
): { caminho: string; nome: string } {
  const padrao = { caminho: 'xl/worksheets/sheet1.xml', nome: 'Planilha1' };
  if (!workbook) return padrao;

  const aba = /<sheet\b([^>]*)\/>/.exec(workbook);
  if (!aba) return padrao;

  const nome = desescapar(atributo(aba[1], 'name') ?? padrao.nome);
  const idRel = atributo(aba[1], 'r:id') ?? atributo(aba[1], 'id');
  if (!idRel || !rels) return { ...padrao, nome };

  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    if (atributo(m[1], 'Id') !== idRel) continue;
    const alvo = (atributo(m[1], 'Target') ?? '').replace(/^\//, '');
    return { caminho: alvo.startsWith('xl/') ? alvo : `xl/${alvo}`, nome };
  }
  return { ...padrao, nome };
}

/* ---------------- valores ---------------- */

/** "A" → 0, "Z" → 25, "AA" → 26. */
export function indiceDaColuna(referencia: string): number {
  const letras = /^([A-Z]+)/.exec(referencia.toUpperCase())?.[1] ?? '';
  let indice = 0;
  for (const letra of letras) indice = indice * 26 + (letra.charCodeAt(0) - 64);
  return indice - 1;
}

/**
 * Serial do Excel para data no formato brasileiro.
 *
 * Até o serial 59 a origem é 1899-12-31; de 61 em diante é 1899-12-30,
 * porque o Excel conta um 29/02/1900 que nunca existiu. O serial 60 é
 * exatamente esse dia fantasma e não corresponde a data nenhuma — some
 * um dia junto com o resto, que é o comportamento de toda planilha.
 */
export function dataDoSerial(serial: number): string {
  const origem = serial < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
  const d = new Date(Math.round(serial) * 86400000 + origem);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(d.getUTCDate())}/${dois(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Número em português: vírgula decimal, sem separador de milhar. */
const numeroPtBr = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(n).replace('.', ',');

/* ---------------- leitura ---------------- */

export function lerXlsx(dados: Uint8Array): PlanilhaLida {
  const avisos: string[] = [];
  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(dados);
  } catch {
    throw new Error('Arquivo .xlsx ilegível — ele pode estar corrompido ou protegido por senha.');
  }

  const texto = (caminho: string) =>
    arquivos[caminho] ? strFromU8(arquivos[caminho]) : undefined;

  const compartilhadas = lerCompartilhadas(texto('xl/sharedStrings.xml'));
  const estilosData = lerEstilosDeData(texto('xl/styles.xml'));
  const { caminho, nome } = caminhoDaPrimeiraAba(
    texto('xl/workbook.xml'), texto('xl/_rels/workbook.xml.rels'),
  );

  const planilha = texto(caminho) ?? texto('xl/worksheets/sheet1.xml');
  if (!planilha) throw new Error('A planilha não tem nenhuma aba legível.');

  const matriz: string[][] = [];
  let largura = 0;

  for (const linha of planilha.matchAll(/<row\b([^>]*)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const corpo = linha[2] ?? '';
    const celulas: string[] = [];

    for (const c of corpo.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const atrs = c[1];
      const conteudo = c[2] ?? '';
      const referencia = atributo(atrs, 'r');
      const tipo = atributo(atrs, 't') ?? 'n';
      const estilo = Number(atributo(atrs, 's') ?? '-1');

      const bruto = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(conteudo)?.[1];
      let valor = '';

      if (tipo === 's') {
        valor = compartilhadas[Number(bruto)] ?? '';
      } else if (tipo === 'inlineStr') {
        valor = textoDeT(conteudo);
      } else if (tipo === 'str' || tipo === 'e') {
        valor = desescapar(bruto ?? '');
      } else if (tipo === 'b') {
        valor = bruto === '1' ? 'VERDADEIRO' : 'FALSO';
      } else if (bruto !== undefined && bruto !== '') {
        const n = Number(bruto);
        valor = !Number.isFinite(n) ? bruto
          : estilosData.has(estilo) ? dataDoSerial(n)
            : numeroPtBr(n);
      }

      // A referência manda: célula vazia no meio da linha não vem no XML.
      const alvo = referencia ? indiceDaColuna(referencia) : celulas.length;
      while (celulas.length < alvo) celulas.push('');
      celulas[alvo] = valor.replace(/[\t\r\n]+/g, ' ').trim();
    }

    largura = Math.max(largura, celulas.length);
    matriz.push(celulas);
  }

  // Linhas totalmente vazias no fim são lixo de planilha, não dado.
  while (matriz.length > 0 && matriz[matriz.length - 1].every((c) => c === '')) matriz.pop();

  const normalizada = matriz.map((l) =>
    l.length === largura ? l : [...l, ...Array(largura - l.length).fill('')]);

  if (normalizada.length === 0) avisos.push('A aba lida está vazia.');

  return { matriz: normalizada, aba: nome, avisos };
}

/** Converte a matriz em texto separado por tabulação, que o leitor de tabela já entende. */
export function matrizParaTexto(matriz: string[][]): string {
  return matriz.map((l) => l.join('\t')).join('\n');
}
