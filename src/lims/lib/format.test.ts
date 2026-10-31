import { describe, expect, it } from 'vitest';

import { dataISOLocal, diasEntre, numero, numeroAte, tempoRelativo } from './format';

/* O laboratório trabalha em Brasília (UTC-3). Depois das 21h local
   já é o dia seguinte em UTC, e é aí que `toISOString().slice(0,10)`
   mostra a data errada no formulário. */
describe('dataISOLocal', () => {
  it('usa o dia do calendário de Brasília, não o de UTC', () => {
    // 2026-03-10T23:30 em Brasília = 2026-03-11T02:30 UTC
    expect(dataISOLocal('2026-03-11T02:30:00.000Z')).toBe('2026-03-10');
  });

  it('não escorrega no começo do dia', () => {
    // 2026-03-10T00:30 em Brasília = 2026-03-10T03:30 UTC
    expect(dataISOLocal('2026-03-10T03:30:00.000Z')).toBe('2026-03-10');
  });

  it('preenche mês e dia com dois dígitos', () => {
    expect(dataISOLocal('2026-01-05T15:00:00.000Z')).toBe('2026-01-05');
  });

  it('devolve vazio para data ausente ou inválida', () => {
    expect(dataISOLocal(undefined)).toBe('');
    expect(dataISOLocal('não é data')).toBe('');
  });

  /* Ida e volta: o que sai para o <input type="date"> tem de voltar
     para o mesmo dia quando o formulário grava ao meio-dia local. */
  it('sobrevive à ida e volta pelo formulário', () => {
    const original = '2026-07-21T22:10:00.000Z'; // 19h10 em Brasília
    const noInput = dataISOLocal(original);
    const gravado = new Date(`${noInput}T12:00:00`).toISOString();
    expect(dataISOLocal(gravado)).toBe(noInput);
  });
});

describe('diasEntre', () => {
  it('conta dias de calendário, não períodos de 24 horas', () => {
    // 23h de um dia para 1h do dia seguinte é 1 dia, não 0.
    expect(diasEntre('2026-03-11T02:00:00.000Z', '2026-03-12T02:00:00.000Z')).toBe(1);
  });

  it('é zero no mesmo dia', () => {
    expect(diasEntre('2026-03-10T12:00:00.000Z', '2026-03-10T23:00:00.000Z')).toBe(0);
  });
});

describe('tempoRelativo', () => {
  /* Mantém a hora do momento e só recua o dia: fixar meio-dia fazia o
     teste depender da hora em que roda. O contêiner anda em UTC e o
     sistema conta dia de calendário em Brasília, então entre 21h e
     meia-noite "ontem ao meio-dia" ainda caía no mesmo dia lá. */
  const diasAtras = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  it('concorda o singular de mês e ano', () => {
    expect(tempoRelativo(diasAtras(35))).toBe('há 1 mês');
    expect(tempoRelativo(diasAtras(70))).toBe('há 2 meses');
    expect(tempoRelativo(diasAtras(400))).toBe('há 1 ano');
    expect(tempoRelativo(diasAtras(800))).toBe('há 2 anos');
  });

  it('usa dias e ontem para o passado recente', () => {
    expect(tempoRelativo(diasAtras(1))).toBe('ontem');
    expect(tempoRelativo(diasAtras(5))).toBe('há 5 dias');
  });
});

describe('numeroAte', () => {
  it('não completa com zero o que é inteiro', () => {
    expect(numeroAte(60, 1)).toBe('60');
    expect(numeroAte(90, 1)).toBe('90');
  });

  it('mantém a casa decimal quando existe, com vírgula', () => {
    expect(numeroAte(2.9, 1)).toBe('2,9');
    expect(numeroAte(1.5, 2)).toBe('1,5');
  });

  it('corta no máximo de casas pedido', () => {
    expect(numeroAte(1.185, 2)).toBe('1,19');
  });

  it('valor inválido vira travessão', () => {
    expect(numeroAte(NaN)).toBe('—');
  });
});

describe('numero', () => {
  /* Resultado de ensaio nunca omite a casa decimal: ela é a precisão
     do método, e "5,8" e "5,80" dizem coisas diferentes no laudo. */
  it('completa as casas, porque em ensaio a casa é precisão', () => {
    expect(numero(5.8, 2)).toBe('5,80');
    expect(numero(60, 1)).toBe('60,0');
  });

  it('usa vírgula decimal e ponto de milhar', () => {
    expect(numero(1234.5, 1)).toBe('1.234,5');
  });
});
