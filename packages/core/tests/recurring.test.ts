import { describe, expect, it } from 'vitest';
import { dueIndexes, nextOccurrence, occurrenceAt } from '../src';

const at = (year: number, month: number, date: number, hour = 9) =>
  new Date(year, month, date, hour).getTime();

describe('occurrenceAt', () => {
  it('keeps the day of the month, or the last day of a shorter month', () => {
    const start = at(2026, 0, 31);

    expect([0, 1, 2, 3].map((index) => occurrenceAt(start, 'month', index))).toEqual([
      at(2026, 0, 31),
      at(2026, 1, 28),
      at(2026, 2, 31),
      at(2026, 3, 30),
    ]);
  });

  it('steps days, weeks and years by the calendar', () => {
    const start = at(2028, 1, 29);

    expect(occurrenceAt(start, 'day', 1)).toBe(at(2028, 2, 1));
    expect(occurrenceAt(start, 'week', 2)).toBe(at(2028, 2, 14));
    expect(occurrenceAt(start, 'year', 1)).toBe(at(2029, 1, 28));
    expect(occurrenceAt(start, 'year', 4)).toBe(at(2032, 1, 29));
  });
});

describe('dueIndexes', () => {
  it('lists the occurrences from an index up to now, the moment included', () => {
    const rule = { start: at(2026, 0, 10), every: 'month' as const };

    expect(dueIndexes(rule, 0, at(2026, 2, 10))).toEqual([0, 1, 2]);
    expect(dueIndexes(rule, 2, at(2026, 2, 10))).toEqual([2]);
    expect(dueIndexes(rule, 0, at(2026, 0, 9))).toEqual([]);
  });
});

describe('nextOccurrence', () => {
  it('is the first occurrence after now', () => {
    const rule = { start: at(2026, 0, 10), every: 'week' as const };

    expect(nextOccurrence(rule, at(2026, 0, 1))).toBe(at(2026, 0, 10));
    expect(nextOccurrence(rule, at(2026, 0, 10))).toBe(at(2026, 0, 17));
  });
});
