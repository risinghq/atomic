import { describe, expect, it } from 'vitest';
import { bucketsOf, contains, elapsedShare, periodOf, samePeriod, shiftPeriod } from '../src';

// Wednesday 2026-03-18, 15:30 local time.
const wednesday = new Date(2026, 2, 18, 15, 30);

describe('periodOf', () => {
  it('starts a week on Monday or on Sunday', () => {
    const monday = periodOf('week', wednesday, 1);
    const sunday = periodOf('week', wednesday, 0);

    expect(monday.start).toEqual(new Date(2026, 2, 16));
    expect(monday.end).toEqual(new Date(2026, 2, 23));
    expect(sunday.start).toEqual(new Date(2026, 2, 15));
  });

  it('keeps a Sunday in the week that ends on it when weeks start on Monday', () => {
    const period = periodOf('week', new Date(2026, 2, 22, 23, 0), 1);

    expect(period.start).toEqual(new Date(2026, 2, 16));
  });

  it('builds months and years from the calendar', () => {
    expect(periodOf('month', wednesday).start).toEqual(new Date(2026, 2, 1));
    expect(periodOf('month', wednesday).end).toEqual(new Date(2026, 3, 1));
    expect(periodOf('year', wednesday).end).toEqual(new Date(2027, 0, 1));
  });

  it('crosses a month boundary inside a week', () => {
    const period = periodOf('week', new Date(2026, 3, 1), 1);

    expect(period.start).toEqual(new Date(2026, 2, 30));
    expect(period.end).toEqual(new Date(2026, 3, 6));
  });
});

describe('shiftPeriod', () => {
  it('moves by whole periods in both directions', () => {
    const week = periodOf('week', wednesday, 1);
    const month = periodOf('month', new Date(2026, 0, 31));

    expect(shiftPeriod(week, -1).start).toEqual(new Date(2026, 2, 9));
    expect(shiftPeriod(month, 1).start).toEqual(new Date(2026, 1, 1));
    expect(shiftPeriod(month, 1).end).toEqual(new Date(2026, 2, 1));
    expect(samePeriod(shiftPeriod(shiftPeriod(week, 3), -3), week)).toBe(true);
  });
});

describe('spans', () => {
  it('contain their start and not their end', () => {
    const month = periodOf('month', wednesday);

    expect(contains(month, month.start)).toBe(true);
    expect(contains(month, month.end)).toBe(false);
  });

  it('report the elapsed share, clamped', () => {
    const week = periodOf('week', wednesday, 1);

    expect(elapsedShare(week, new Date(2026, 2, 19, 12))).toBeCloseTo(3.5 / 7, 2);
    expect(elapsedShare(week, new Date(2030, 0, 1))).toBe(1);
    expect(elapsedShare(week, new Date(2020, 0, 1))).toBe(0);
  });
});

describe('bucketsOf', () => {
  it('splits a week or month into days and a year into months', () => {
    expect(bucketsOf(periodOf('week', wednesday))).toHaveLength(7);
    expect(bucketsOf(periodOf('month', new Date(2028, 1, 10)))).toHaveLength(29);
    expect(bucketsOf(periodOf('year', wednesday))).toHaveLength(12);
  });

  it('keeps calendar days across a daylight-saving change', () => {
    const days = bucketsOf(periodOf('month', wednesday));

    for (const [index, bucket] of days.entries()) {
      expect(bucket.start.getDate()).toBe(index + 1);
      expect(bucket.start.getHours()).toBe(0);
    }
  });
});
