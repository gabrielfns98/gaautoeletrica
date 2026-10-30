/* O arquivo de teste é montado aqui, com zipSync: assim o leitor é
   exercitado contra um .xlsx de verdade, e não contra um XML solto. */

import { strToU8, zipSync } from 'fflate';
import { dataDoSerial, indiceDaColuna, lerXlsx, matrizParaTexto } from './xlsx';
import { lerTabela } from './importacao';

let falhas = 0;
const igual = (a: unknown, b: unknown, msg: string) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { falhas++; console.log(`FALHOU ${msg}\n  obtido:   ${JSON.stringify(a)}\n  esperado: ${JSON.stringify(b)}`); }
  else console.log(`ok   ${msg}`);
};

/* ---------- colunas e datas ---------- */
igual(indiceDaColuna('A1'), 0, 'coluna A');
igual(indiceDaColuna('Z9'), 25, 'coluna Z');
igual(indiceDaColuna('AA1'), 26, 'coluna AA');
igual(indiceDaColuna('BC12'), 54, 'coluna BC');

igual(dataDoSerial(45000), '15/03/2023', 'serial 45000');
igual(dataDoSerial(1), '01/01/1900', 'serial 1 — antes do dia fantasma');
igual(dataDoSerial(46234), '31/07/2026', 'serial de uma coleta recente');

/* ---------- planilha montada à mão ---------- */

const compartilhadas = ['Protocolo', 'PH-H2O', 'Coleta', 'Observação', '26.014532', '26.014533'];

const xlsx = zipSync({
  '[Content_Types].xml': strToU8(
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
  // A aba não é sheet1.xml de propósito: o caminho tem de vir do relacionamento.
  'xl/workbook.xml': strToU8(
    '<?xml version="1.0"?><workbook><sheets>' +
    '<sheet name="Resultados &amp; CQ" sheetId="1" r:id="rId7"/>' +
    '</sheets></workbook>'),
  'xl/_rels/workbook.xml.rels': strToU8(
    '<?xml version="1.0"?><Relationships>' +
    '<Relationship Id="rId7" Target="worksheets/sheet4.xml"/>' +
    '</Relationships>'),
  'xl/sharedStrings.xml': strToU8(
    '<?xml version="1.0"?><sst>' +
    compartilhadas.map((s) => `<si><t>${s.replace(/&/g, '&amp;')}</t></si>`).join('') +
    '</sst>'),
  // estilo 0 = geral, 1 = data nativa (14), 2 = data personalizada (164)
  'xl/styles.xml': strToU8(
    '<?xml version="1.0"?><styleSheet>' +
    '<numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy;@"/>' +
    '<numFmt numFmtId="165" formatCode="0.000&quot;mg/dm³&quot;"/></numFmts>' +
    '<cellXfs count="4">' +
    '<xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/>' +
    '</cellXfs></styleSheet>'),
  'xl/worksheets/sheet4.xml': strToU8(
    '<?xml version="1.0"?><worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c>' +
    '<c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row>' +
    // número, data nativa e texto embutido
    '<row r="2"><c r="A2" t="s"><v>4</v></c><c r="B2"><v>5.42</v></c>' +
    '<c r="C2" s="1"><v>46234</v></c>' +
    '<c r="D2" t="inlineStr"><is><t>amostra &lt;seca&gt;</t></is></c></row>' +
    // coluna B faltando no XML: a referência é que diz onde a célula está
    '<row r="3"><c r="A3" t="s"><v>5</v></c>' +
    '<c r="C3" s="2"><v>46235</v></c><c r="D3" t="e"><v>#DIV/0!</v></c></row>' +
    // booleano, inteiro e número com formato personalizado
    '<row r="4"><c r="A4" t="str"><v>26.014534</v></c><c r="B4"><v>7</v></c>' +
    '<c r="C4" t="b"><v>1</v></c><c r="D4" s="3"><v>18.345</v></c></row>' +
    // linha vazia no fim, que planilha costuma deixar
    '<row r="5"/>' +
    '</sheetData></worksheet>'),
});

const lida = lerXlsx(xlsx);

igual(lida.aba, 'Resultados & CQ', 'nome da aba com entidade XML');
igual(lida.matriz.length, 4, 'linha vazia do fim descartada');
igual(lida.matriz[0], ['Protocolo', 'PH-H2O', 'Coleta', 'Observação'], 'cabeçalho do texto compartilhado');
igual(lida.matriz[1], ['26.014532', '5,42', '31/07/2026', 'amostra <seca>'],
  'número com vírgula, data nativa e texto embutido');
igual(lida.matriz[2], ['26.014533', '', '01/08/2026', '#DIV/0!'],
  'célula ausente vira vazio na posição certa, formato de data personalizado e erro de fórmula');
igual(lida.matriz[3], ['26.014534', '7', 'VERDADEIRO', '18,345'],
  'texto de fórmula, inteiro sem vírgula, booleano e número com formato personalizado');

/* ---------- integração com o leitor de tabela ---------- */

const tabela = lerTabela(matrizParaTexto(lida.matriz));
igual(tabela.separador, '\t', 'matriz vira tabulação');
igual(tabela.temCabecalho, true, 'cabeçalho reconhecido');
igual(tabela.decimalVirgula, true, 'decimal é vírgula, como o Excel em português');
igual(tabela.colunas.map((c) => c.titulo), ['Protocolo', 'PH-H2O', 'Coleta', 'Observação'],
  'títulos das colunas');
igual(tabela.linhas.length, 3, 'três linhas de dado');

/* ---------- arquivo inválido ---------- */
let recusou = false;
try { lerXlsx(strToU8('isto não é um zip')); } catch { recusou = true; }
igual(recusou, true, 'arquivo que não é .xlsx é recusado com erro claro');

console.log(falhas === 0 ? '\nTODOS OS TESTES DE XLSX PASSARAM' : `\n${falhas} FALHA(S)`);
if (falhas) process.exit(1);
