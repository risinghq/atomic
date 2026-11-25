/** Money as a whole number of cents, so sums never pick up float error. */
export type Cents = number;

/**
 * Reads typed text such as `12`, `12.5` or `12.50` as cents. Returns null for
 * text that is not a plain non-negative amount with at most two decimals.
 */
export function parseCents(text: string): Cents | null {
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(text.trim());
  if (!match) return null;

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));

  return whole * 100 + fraction;
}

/**
 * Rounds a float amount to cents, half away from zero. It reads the digits of
 * `toFixed(10)` because multiplying by 100 first moves values such as 1.005
 * across the rounding boundary (1.005 * 100 is 100.49999999999999).
 */
export function toCents(amount: number): Cents {
  if (!Number.isFinite(amount)) return Number.NaN;

  const [wholePart = '0', fractionPart = ''] = Math.abs(amount).toFixed(10).split('.');
  const hundredths = Number(fractionPart.slice(0, 2));
  const roundsUp = Number(fractionPart[2]) >= 5;
  const cents = Number(wholePart) * 100 + hundredths + (roundsUp ? 1 : 0);

  return amount < 0 ? -cents : cents;
}

/** The amount in currency units, for display. */
export function fromCents(cents: Cents): number {
  return cents / 100;
}

export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0;

  for (const value of values) total += value;

  return total;
}
