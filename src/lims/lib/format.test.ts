import { describe, expect, it } from 'vitest';

import { dataISOLocal, diasEntre } from './format';

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
