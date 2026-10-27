import {
  detectarSeparador, lerData, lerNumero, lerTabela, pareceCabecalho,
  sugerirMapeamento, resumir, ALVOS_AMOSTRA,
} from './importacao';

let falhas = 0;
const igual = (a: unknown, b: unknown, msg: string) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { falhas++; console.log(`FALHOU ${msg}\n  obtido:   ${JSON.stringify(a)}\n  esperado: ${JSON.stringify(b)}`); }
  else console.log(`ok   ${msg}`);
};

/* ---------- separador ---------- */
igual(detectarSeparador(['a;b;c', '1;2;3']), ';', 'ponto-e-vírgula');
igual(detectarSeparador(['a,b,c', '1,2,3']), ',', 'vírgula');
igual(detectarSeparador(['a\tb\tc', '1\t2\t3']), '\t', 'tabulação — colado do Excel');
// o endereço com vírgulas não pode roubar a detecção
igual(detectarSeparador([
  'protocolo;cliente;endereco',
  '26.01;Fazenda Serra Azul;Rod. BR-242, km 18, Zona Rural',
  '26.02;Usina Santa Terezinha;Av. das Nações, 1420',
]), ';', 'vírgula dentro do campo não vence o ponto-e-vírgula');

/* ---------- cabeçalho ---------- */
igual(pareceCabecalho(['protocolo', 'ph'], [['26.01', '5,42']]), true, 'cabeçalho de texto sobre dados numéricos');
igual(pareceCabecalho(['26.01', '5,42'], [['26.02', '5,13']]), false, 'duas linhas de dados: sem cabeçalho');
// planilha toda textual — o caso de uma relação de amostras
igual(pareceCabecalho(['Propriedade', 'Talhão'], [['Serra Azul', 'T-01'], ['Nova Canaã', 'T-04']]), true,
  'cabeçalho textual sobre corpo textual');
igual(pareceCabecalho(['Serra Azul', 'T-01'], [['Serra Azul', 'T-02']]), false,
  'valor que se repete no corpo não é cabeçalho');
igual(pareceCabecalho(['Talhão', 'Talhão'], [['A', 'B']]), false, 'rótulo duplicado não é cabeçalho');
igual(pareceCabecalho(['Talhão', ''], [['A', 'B']]), false, 'rótulo vazio não é cabeçalho');

/* ---------- número no padrão brasileiro ---------- */
igual(lerNumero('5,42'), 5.42, 'decimal vírgula');
igual(lerNumero('5.42', false), 5.42, 'decimal ponto quando separador é vírgula');
igual(lerNumero('1.234,56'), 1234.56, 'milhar ponto + decimal vírgula');
igual(lerNumero('1,234.56'), 1234.56, 'milhar vírgula + decimal ponto');
igual(lerNumero('1,234', false), 1234, 'vírgula só pode ser milhar quando separa campos');
igual(lerNumero('-3,5'), -3.5, 'negativo');
igual(lerNumero('  7,1  '), 7.1, 'espaços em volta');
igual(lerNumero(''), undefined, 'célula vazia');
igual(lerNumero('n/a'), undefined, 'texto não numérico');
igual(lerNumero('< 0,05'), undefined, 'texto com símbolo não vira número');

/* ---------- data ---------- */
igual(lerData('15/03/2026')?.slice(0, 10), '2026-03-15', 'dd/mm/aaaa');
igual(lerData('5-3-26')?.slice(0, 10), '2026-03-05', 'd-m-aa');
igual(lerData('2026-03-15')?.slice(0, 10), '2026-03-15', 'aaaa-mm-dd');
igual(lerData('bobagem'), undefined, 'data inválida');
igual(lerData(''), undefined, 'data vazia');

/* ---------- tabela completa ---------- */
const csv = `Protocolo;Identificação;Propriedade;Talhão;Profundidade;pH água
26.014532;Ponto 1;Serra Azul;T-01;0-20 cm;5,42
26.014533;Ponto 2;Serra Azul;T-01;20-40 cm;4,87
26.014534;Ponto 3;Serra Azul;T-02;0-20 cm;6,13`;
const t = lerTabela(csv);
igual(t.separador, ';', 'tabela: separador');
igual(t.temCabecalho, true, 'tabela: cabeçalho detectado');
igual(t.decimalVirgula, true, 'tabela: vírgula é decimal');
igual(t.colunas.length, 6, 'tabela: 6 colunas');
igual(t.linhas.length, 3, 'tabela: 3 linhas de dados');
igual(t.colunas[0].titulo, 'Protocolo', 'tabela: título da 1ª coluna');
igual(t.colunas[5].numerica, true, 'tabela: coluna de pH é numérica');
igual(t.colunas[2].numerica, false, 'tabela: coluna de propriedade não é numérica');
igual(t.avisos.length, 0, 'tabela limpa não gera aviso');

/* ---------- BOM, CRLF e aspas ---------- */
const comAspas = '﻿"Protocolo";"Observação"\r\n"26.01";"Amostra ""A""; com ponto-e-vírgula"\r\n';
const ta = lerTabela(comAspas);
igual(ta.linhas[0][0], '26.01', 'BOM e CRLF tratados');
igual(ta.linhas[0][1], 'Amostra "A"; com ponto-e-vírgula', 'aspas escapadas e separador dentro do campo');

/* ---------- quebra de linha dentro do campo ---------- */
const comQuebra = 'Protocolo;Obs\n26.01;"linha 1\nlinha 2"\n26.02;ok';
const tq = lerTabela(comQuebra);
igual(tq.linhas.length, 2, 'quebra dentro de aspas não cria linha nova');
igual(tq.linhas[0][1], 'linha 1\nlinha 2', 'conteúdo multilinha preservado');

/* ---------- linhas irregulares ---------- */
const irregular = 'a;b;c\n1;2;3\n4;5\n6;7;8';
const ti = lerTabela(irregular);
igual(ti.linhas.length, 3, 'linhas irregulares mantidas');
igual(ti.linhas[1], ['4', '5', ''], 'linha curta preenchida com vazio');
igual(ti.avisos.length > 0, true, 'linha irregular gera aviso');

/* ---------- arquivo vazio ---------- */
igual(lerTabela('').linhas.length, 0, 'arquivo vazio');
igual(lerTabela('   \n  \n').colunas.length, 0, 'só espaços em branco');

/* ---------- mapeamento ---------- */
const mapa = sugerirMapeamento(t.colunas, ALVOS_AMOSTRA);
igual(mapa[0], 'protocolo', 'mapeia Protocolo');
igual(mapa[1], 'identificacao', 'mapeia Identificação');
igual(mapa[2], 'propriedade', 'mapeia Propriedade');
igual(mapa[3], 'talhao', 'mapeia Talhão');
igual(mapa[4], 'profundidade', 'mapeia Profundidade');
igual(mapa[5], undefined, 'coluna de resultado não vira campo de amostra');

// cada campo é usado uma vez só
const duplicado = lerTabela('Fazenda;Propriedade\nA;B');
const md = sugerirMapeamento(duplicado.colunas, ALVOS_AMOSTRA);
igual(Object.values(md).filter((v) => v === 'propriedade').length, 1, 'campo não é atribuído duas vezes');

// cabeçalho desconhecido não inventa mapeamento
const estranho = lerTabela('XPTO;ZZZ\n1;2');
igual(Object.keys(sugerirMapeamento(estranho.colunas, ALVOS_AMOSTRA)).length, 0, 'título desconhecido fica sem mapa');

/* ---------- resumo ---------- */
igual(resumir([
  { numero: 1, dados: {}, situacao: 'pronta' as const },
  { numero: 2, dados: {}, situacao: 'erro' as const },
  { numero: 3, dados: {}, situacao: 'alerta' as const },
  { numero: 4, dados: {}, situacao: 'pronta' as const },
]), { total: 4, prontas: 2, alertas: 1, erros: 1 }, 'resumo das situações');

console.log(falhas === 0 ? '\nTODOS OS TESTES DE IMPORTAÇÃO PASSARAM' : `\n${falhas} FALHA(S)`);
if (falhas) process.exit(1);
