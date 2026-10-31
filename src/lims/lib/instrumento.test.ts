import { describe, expect, it } from 'vitest';

import { lerBlocos, prepararArquivo, recortarRelatorio } from './instrumento';
import { lerTabela } from './importacao';

/* Os arquivos abaixo têm a forma do que os aparelhos realmente
   exportam: a tabela embrulhada no relatório do fabricante, e o
   relatório vertical com um bloco por amostra. */

const RELATORIO_ESPECTRO = `Thermo Scientific Genesys 150
Method: Phosphorus 660nm
Operator: R. CIPRIANO
Date: 2026-10-30 09:14

Sample ID;Abs 660nm;Conc
26.014533;0,750;11,97
26.014534;0,412;6,53
26.014535;1,204;19,28

End of report
Total samples: 3`;

const RELATORIO_BLOCOS = `Agilent 240FS AA
Sample: 26.014533
Ca: 2,41
Mg: 0,88
Na: 0,05

Sample: 26.014534
Ca: 3,10
Mg: 1,02
Na: 0,07

Sample: 26.014535
Ca: 1,95
Mg: 0,71`;

const CSV_LIMPO = `Amostra;P-MEL;K
26.014533;12,3;117
26.014534;8,1;94`;

describe('recortarRelatorio', () => {
  it('acha a tabela dentro do relatório do aparelho', () => {
    const r = recortarRelatorio(RELATORIO_ESPECTRO);
    expect(r.linhasDescartadasNoInicio).toBe(5);
    expect(r.linhasDescartadasNoFim).toBe(3);
    expect(r.colunas).toBe(3);
    expect(r.texto.split('\n')).toHaveLength(4); // cabeçalho + 3 amostras
  });

  /* O defeito que isto evita: lido como CSV, "Thermo Scientific
     Genesys 150" vira o cabeçalho e toda coluna sai trocada, sem
     nenhum erro na tela. */
  it('depois do recorte, a tabela é lida com as colunas certas', () => {
    const t = lerTabela(recortarRelatorio(RELATORIO_ESPECTRO).texto);
    expect(t.colunas.map((c) => c.titulo)).toEqual(['Sample ID', 'Abs 660nm', 'Conc']);
    expect(t.linhas).toHaveLength(3);
    expect(t.linhas[0][0]).toBe('26.014533');
  });

  it('sem o recorte, o cabeçalho sai errado', () => {
    const t = lerTabela(RELATORIO_ESPECTRO);
    expect(t.colunas.map((c) => c.titulo)).not.toEqual(['Sample ID', 'Abs 660nm', 'Conc']);
  });

  it('arquivo que já é só tabela passa intacto', () => {
    const r = recortarRelatorio(CSV_LIMPO);
    expect(r.linhasDescartadasNoInicio).toBe(0);
    expect(r.linhasDescartadasNoFim).toBe(0);
    expect(r.texto.trim()).toBe(CSV_LIMPO.trim());
  });

  it('texto sem nenhuma tabela é devolvido como veio', () => {
    const solto = 'Relatório\nsem tabela\nnenhuma';
    expect(recortarRelatorio(solto).texto).toBe(solto);
  });

  it('arquivo vazio não quebra', () => {
    expect(recortarRelatorio('').texto).toBe('');
  });
});

describe('lerBlocos', () => {
  it('converte um bloco por amostra em uma linha por amostra', () => {
    const b = lerBlocos(RELATORIO_BLOCOS)!;
    expect(b.amostras).toBe(3);
    expect(b.campos).toEqual(['Sample', 'Ca', 'Mg', 'Na']);
  });

  it('o CSV gerado é lido com as amostras nas linhas', () => {
    const t = lerTabela(lerBlocos(RELATORIO_BLOCOS)!.texto);
    expect(t.colunas.map((c) => c.titulo)).toEqual(['Sample', 'Ca', 'Mg', 'Na']);
    expect(t.linhas).toHaveLength(3);
    expect(t.linhas[0]).toEqual(['26.014533', '2,41', '0,88', '0,05']);
  });

  /* Um bloco pode trazer um elemento que outro não traz: a terceira
     amostra não tem Na, e a célula fica vazia em vez de deslocar. */
  it('bloco incompleto deixa a célula vazia, não desloca a linha', () => {
    const t = lerTabela(lerBlocos(RELATORIO_BLOCOS)!.texto);
    expect(t.linhas[2]).toEqual(['26.014535', '1,95', '0,71', '']);
  });

  it('CSV comum não é confundido com formato vertical', () => {
    expect(lerBlocos(CSV_LIMPO)).toBeUndefined();
    expect(lerBlocos(RELATORIO_ESPECTRO)).toBeUndefined();
  });

  it('sem rótulo que identifique a amostra, não arrisca', () => {
    expect(lerBlocos('Ca: 2,41\nMg: 0,88\nFe: 1,2\nZn: 0,4')).toBeUndefined();
  });

  it('aceita "=" e tabulação como separador do par', () => {
    const b = lerBlocos('Sample=A1\nCa=2,4\nMg=0,9\n\nSample=A2\nCa=3,1\nMg=1,0')!;
    expect(b.amostras).toBe(2);
  });

  it('texto vazio não produz blocos', () => {
    expect(lerBlocos('')).toBeUndefined();
  });
});

describe('prepararArquivo', () => {
  it('desembrulha o relatório e diz o que ignorou', () => {
    const r = prepararArquivo(RELATORIO_ESPECTRO);
    expect(r.notas[0]).toMatch(/5 linhas de cabeçalho do aparelho e 3 linhas de rodapé/);
    expect(lerTabela(r.texto).linhas).toHaveLength(3);
  });

  it('reconhece o relatório em blocos e diz quantas amostras achou', () => {
    const r = prepararArquivo(RELATORIO_BLOCOS);
    expect(r.notas[0]).toMatch(/3 amostras/);
    expect(lerTabela(r.texto).linhas).toHaveLength(3);
  });

  it('CSV limpo passa sem nota nenhuma', () => {
    const r = prepararArquivo(CSV_LIMPO);
    expect(r.notas).toEqual([]);
    expect(r.texto).toBe(CSV_LIMPO);
  });

  /* O vertical tem de ser tentado antes do recorte: um relatório em
     blocos também tem sequências regulares, e o recorte sozinho
     devolveria um pedaço de um bloco. */
  it('o formato vertical vence o recorte', () => {
    expect(prepararArquivo(RELATORIO_BLOCOS).notas[0]).toMatch(/blocos/);
  });
});
