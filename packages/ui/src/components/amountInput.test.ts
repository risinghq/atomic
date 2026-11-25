import { describe, expect, it } from 'vitest';
import { amountValue, applyKey, type PadKey } from './amountInput';

const type = (keys: PadKey[]) => keys.reduce(applyKey, '');

describe('applyKey', () => {
  it('appends digits and one decimal point', () => {
    expect(type(['1', '2', '.', '5'])).toBe('12.5');
    expect(type(['1', '.', '.', '2'])).toBe('1.2');
  });

  it('starts a bare point with a zero', () => {
    expect(type(['.', '5'])).toBe('0.5');
  });

  it('keeps at most two decimals', () => {
    expect(type(['3', '.', '9', '9', '9'])).toBe('3.99');
  });

  it('replaces a lone leading zero', () => {
    expect(type(['0', '0', '7'])).toBe('7');
  });

  it('stops at nine whole digits', () => {
    expect(type(Array<PadKey>(12).fill('9'))).toBe('999999999');
  });

  it('deletes the last character', () => {
    expect(applyKey('12.5', 'delete')).toBe('12.');
    expect(applyKey('', 'delete')).toBe('');
  });
});

describe('amountValue', () => {
  it('reads the text as a number, and empty text as zero', () => {
    expect(amountValue('12.')).toBe(12);
    expect(amountValue('')).toBe(0);
  });
});
