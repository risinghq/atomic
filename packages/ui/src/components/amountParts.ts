export type SignDisplay = 'negative' | 'always' | 'never';

export type AmountFormat = {
  currency?: string;
  locale?: string;
  /** `negative` shows only a minus; `always` adds a plus to positive values. */
  sign?: SignDisplay;
};

export type AmountParts = {
  sign: '' | '+' | '-';
  symbol: string;
  number: string;
};

/**
 * Splits a money value into its sign, currency symbol and digits, so each can
 * be styled on its own: Dime draws the symbol small and grey beside a large
 * number.
 */
export function amountParts(
  value: number,
  { currency = 'PEN', locale = 'es-PE', sign = 'negative' }: AmountFormat = {}
): AmountParts {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(Math.abs(value));

  const symbol = parts.find((part) => part.type === 'currency')?.value ?? '';
  const number = parts
    .filter((part) => part.type !== 'currency' && part.type !== 'literal')
    .map((part) => part.value)
    .join('');

  const isZero = number.replace(/\D/g, '').replace(/0/g, '') === '';
  let shown: AmountParts['sign'] = '';
  if (sign !== 'never' && !isZero) {
    if (value < 0) shown = '-';
    else if (sign === 'always') shown = '+';
  }
  return { sign: shown, symbol, number };
}
