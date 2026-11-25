import { describe, expect, it } from 'vitest';
import {
  budgetStatus,
  bucketsOf,
  periodOf,
  totalIn,
  totalsByBucket,
  totalsByCategory,
  type Transaction,
} from '../src';

const at = (day: number, hour = 12) => new Date(2026, 2, day, hour).getTime();

const transactions: Transaction[] = [
  { id: 'a', kind: 'expense', amount: 1250, categoryId: 'food', note: '', at: at(16) },
  { id: 'b', kind: 'expense', amount: 800, categoryId: 'transport', note: '', at: at(17) },
  { id: 'c', kind: 'expense', amount: 2000, categoryId: 'food', note: '', at: at(18) },
  { id: 'd', kind: 'income', amount: 500000, categoryId: 'salary', note: '', at: at(18) },
  { id: 'e', kind: 'expense', amount: 9900, categoryId: 'food', note: '', at: at(2) },
];

const week = periodOf('week', new Date(2026, 2, 18), 1);

describe('totals', () => {
  it('sums one kind, optionally one category, inside the span', () => {
    expect(totalIn(transactions, week)).toBe(4050);
    expect(totalIn(transactions, week, 'expense', 'food')).toBe(3250);
    expect(totalIn(transactions, week, 'income')).toBe(500000);
  });

  it('groups by category, largest first', () => {
    expect(totalsByCategory(transactions, week)).toEqual([
      { categoryId: 'food', total: 3250 },
      { categoryId: 'transport', total: 800 },
    ]);
  });

  it('totals each bucket in order', () => {
    expect(totalsByBucket(transactions, bucketsOf(week))).toEqual([1250, 800, 2000, 0, 0, 0, 0]);
  });
});

describe('budgetStatus', () => {
  it('measures a category budget in the period around now', () => {
    const status = budgetStatus(
      { id: 'x', categoryId: 'food', amount: 5000, period: 'week' },
      transactions,
      new Date(2026, 2, 18, 12),
      1
    );

    expect(status.spent).toBe(3250);
    expect(status.left).toBe(1750);
    expect(status.share).toBeCloseTo(0.65);
    expect(status.elapsed).toBeCloseTo(2.5 / 7, 2);
    expect(status.over).toBe(false);
  });

  it('counts every expense for the overall budget and reports going over', () => {
    const status = budgetStatus(
      { id: 'y', categoryId: null, amount: 10000, period: 'month' },
      transactions,
      new Date(2026, 2, 20),
      1
    );

    expect(status.spent).toBe(13950);
    expect(status.left).toBe(-3950);
    expect(status.over).toBe(true);
  });
});
