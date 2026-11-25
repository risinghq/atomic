import { describe, expect, it } from 'vitest';
import { untilMidnight } from '../src/useNow';

describe('untilMidnight', () => {
  it('waits until one second past the next local midnight', () => {
    expect(untilMidnight(new Date(2026, 10, 25, 23, 59, 30))).toBe(31_000);
  });

  it('waits a full day from midnight', () => {
    expect(untilMidnight(new Date(2026, 10, 25))).toBe(24 * 60 * 60 * 1000 + 1000);
  });
});
