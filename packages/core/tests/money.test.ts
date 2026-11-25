import { describe, expect, it } from 'vitest';
import { fromCents, parseCents, sumCents, toCents } from '../src';

describe('parseCents', () => {
  it('reads whole amounts and up to two decimals', () => {
    expect(parseCents('12')).toBe(1200);
    expect(parseCents('12.5')).toBe(1250);
    expect(parseCents('12.05')).toBe(1205);
    expect(parseCents('0.')).toBe(0);
  });

  it('rejects anything else', () => {
    expect(parseCents('')).toBeNull();
    expect(parseCents('-1')).toBeNull();
    expect(parseCents('1.234')).toBeNull();
    expect(parseCents('1,5')).toBeNull();
  });
});

describe('toCents', () => {
  it('rounds half away from zero without float drift', () => {
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(-2.675)).toBe(-268);
    expect(toCents(Number.NaN)).toBeNaN();
  });
});

it('sums cents and converts back to units', () => {
  expect(sumCents([10, 20, 30])).toBe(60);
  expect(fromCents(1250)).toBe(12.5);
});
