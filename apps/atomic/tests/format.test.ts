import { periodOf, shiftPeriod, type Transaction } from '@atomic/core';
import { describe, expect, it } from 'vitest';
import { budgetLine, dayTitle, daysLeft, groupByDay, periodTitle } from '../src/format';

// Wednesday 25 November 2026, noon local time.
const now = new Date(2026, 10, 25, 12);

describe('dayTitle', () => {
  it('names today and yesterday, then the weekday and date', () => {
    expect(dayTitle(new Date(2026, 10, 25, 8).getTime(), now)).toBe('Hoy');
    expect(dayTitle(new Date(2026, 10, 24, 23).getTime(), now)).toBe('Ayer');
    expect(dayTitle(new Date(2026, 10, 23, 9).getTime(), now)).toBe('Lunes 23 nov');
    expect(dayTitle(new Date(2025, 10, 23, 9).getTime(), now)).toBe('Domingo 23 nov 2025');
  });
});

describe('periodTitle', () => {
  it('names the current week, other weeks by range, months and years', () => {
    const week = periodOf('week', now, 1);

    expect(periodTitle(week, now, 1)).toBe('Esta semana');
    expect(periodTitle(shiftPeriod(week, -1), now, 1)).toBe('16 – 22 nov');
    expect(periodTitle(shiftPeriod(week, -4), now, 1)).toBe('26 oct – 1 nov');
    expect(periodTitle(periodOf('month', now, 1), now, 1)).toBe('Noviembre 2026');
    expect(periodTitle(periodOf('year', now, 1), now, 1)).toBe('2026');
  });
});

describe('budgets', () => {
  it('counts the days left with today', () => {
    expect(daysLeft(periodOf('month', now, 1), now)).toBe(6);
    expect(daysLeft(periodOf('week', now, 1), now)).toBe(5);
  });

  it('spreads what is left over the remaining days, or says when it renews', () => {
    const period = periodOf('month', now, 1);
    const base = { period, spent: 0, share: 0, elapsed: 0.8 };

    expect(budgetLine({ ...base, left: 6000, over: false }, 'PEN', now)).toBe(
      'S/\u00a010.00 por día'
    );
    expect(budgetLine({ ...base, left: -100, over: true }, 'PEN', now)).toBe(
      'Se renueva en 6 días'
    );
  });
});

function transaction(
  id: string,
  day: number,
  kind: 'income' | 'expense',
  amount: number
): Transaction {
  return {
    id,
    kind,
    amount,
    categoryId: 'food',
    note: '',
    at: new Date(2026, 10, day, 10).getTime(),
  };
}

describe('groupByDay', () => {
  it('splits by calendar day and nets income against expenses', () => {
    const days = groupByDay([
      transaction('a', 25, 'expense', 500),
      transaction('b', 25, 'income', 2000),
      transaction('c', 24, 'expense', 300),
    ]);

    expect(days.map((day) => [day.net, day.transactions.length])).toEqual([
      [1500, 2],
      [-300, 1],
    ]);
  });
});
