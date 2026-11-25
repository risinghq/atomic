export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'delete';

/** Whole-number digits kept, enough for any expense and short enough to fit. */
const MAX_WHOLE_DIGITS = 9;

/**
 * Applies one number-pad key to the amount text. A key that would make the
 * text an invalid amount leaves it unchanged: a second point, a third decimal,
 * a leading zero before a digit, or more whole digits than fit.
 */
export function applyKey(text: string, key: PadKey): string {
  if (key === 'delete') return text.slice(0, -1);

  const [whole = '', fraction] = text.split('.');
  if (key === '.') {
    if (fraction !== undefined) return text;
    return text === '' ? '0.' : `${text}.`;
  }
  if (fraction !== undefined) return fraction.length >= 2 ? text : text + key;
  if (whole === '0') return key;
  if (whole.length >= MAX_WHOLE_DIGITS) return text;
  return text + key;
}

/** The amount the text stands for, or 0 while it is empty. */
export function amountValue(text: string): number {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : 0;
}
