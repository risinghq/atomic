import { defaultCategories, type Transaction } from '@atomic/core';
import { describe, expect, it } from '@jest/globals';
import { bom, csvName, toCsv } from '../src/data/csv';

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
