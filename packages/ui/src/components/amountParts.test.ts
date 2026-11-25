import { describe, expect, it } from 'vitest';
import { amountParts } from './amountParts';

describe('amountParts', () => {
  it('splits the symbol from the grouped digits', () => {
    expect(amountParts(1234.5)).toEqual({ sign: '', symbol: 'S/', number: '1,234.50' });
  });

  it('shows a minus for a negative value and drops it from the digits', () => {
    expect(amountParts(-12.7)).toEqual({ sign: '-', symbol: 'S/', number: '12.70' });
  });

  it('adds a plus when asked to always sign', () => {
    expect(amountParts(250, { sign: 'always' }).sign).toBe('+');
  });

  it('never signs a value that rounds to zero', () => {
    expect(amountParts(-0.001, { sign: 'always' }).sign).toBe('');
  });

  it('follows the given currency and locale', () => {
    expect(amountParts(5.99, { currency: 'USD', locale: 'en-US' })).toEqual({
      sign: '',
      symbol: '$',
      number: '5.99',
    });
  });
});
