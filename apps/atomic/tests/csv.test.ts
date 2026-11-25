import { defaultCategories, type Transaction } from '@atomic/core';
import { describe, expect, it } from '@jest/globals';
import { bom, csvName, exportChoices, exported, toCsv } from '../src/data/csv';

const categories = defaultCategories;

function transaction(fields: Partial<Transaction>): Transaction {
  return {
    id: 'id',
    kind: 'expense',
    amount: 100,
    categoryId: 'food',
    note: '',
    at: new Date(2026, 10, 25, 12).getTime(),
    ...fields,
  };
}

describe('toCsv', () => {
  it('writes a header and one row per transaction, oldest first', () => {
    const csv = toCsv(
      [
        transaction({ amount: 1805, note: 'Menú', at: new Date(2026, 10, 25, 13, 5).getTime() }),
        transaction({
          kind: 'income',
          categoryId: 'salary',
          amount: 250000,
          at: new Date(2026, 10, 1, 9).getTime(),
        }),
      ],
      categories
    );

    expect(csv).toBe(
      bom +
        'fecha,tipo,categoría,nota,monto\r\n' +
        '2026-11-01 09:00,ingreso,Sueldo,,2500.00\r\n' +
        '2026-11-25 13:05,gasto,Comida,Menú,18.05\r\n'
    );
  });

  it('quotes a note that holds a comma, a quote or a line break', () => {
    const csv = toCsv([transaction({ amount: 7, note: 'Pan, "integral"\nx2' })], categories);

    expect(csv.split('\r\n')[1]).toBe('2026-11-25 12:00,gasto,Comida,"Pan, ""integral""\nx2",0.07');
  });
});

describe('csvName', () => {
  it('names the file after the local date', () => {
    expect(csvName(new Date(2026, 0, 5, 23, 30))).toBe('atomic-2026-01-05.csv');
  });
});

describe('exportChoices', () => {
  const choices = exportChoices(new Date(2026, 0, 5, 23, 30), 1);

  it('names each file after the period it covers, crossing into last year', () => {
    expect(choices.map((choice) => [choice.title, choice.detail, choice.file])).toEqual([
      ['Este mes', 'Enero 2026', 'atomic-2026-01.csv'],
      ['Mes pasado', 'Diciembre 2025', 'atomic-2025-12.csv'],
      ['Este año', '2026', 'atomic-2026.csv'],
      ['Todo', undefined, 'atomic-2026-01-05.csv'],
    ]);
  });

  it('keeps only the transactions inside the chosen period', () => {
    const december = transaction({ id: 'dec', at: new Date(2025, 11, 31, 23, 59).getTime() });
    const january = transaction({ id: 'jan', at: new Date(2026, 0, 1, 0, 0).getTime() });
    const ids = (title: string) => {
      const choice = choices.find((candidate) => candidate.title === title);
      if (!choice) throw new Error(`No export choice ${title}`);

      return exported([december, january], choice).map((t) => t.id);
    };

    expect(ids('Este mes')).toEqual(['jan']);
    expect(ids('Mes pasado')).toEqual(['dec']);
    expect(ids('Todo')).toEqual(['dec', 'jan']);
  });
});
