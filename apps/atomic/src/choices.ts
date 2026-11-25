import type { WeekStart } from '@atomic/core';

/** The currencies offered at setup and in Ajustes, as ISO 4217 codes. */
export const currencies = [
  { value: 'PEN', label: 'S/ Soles' },
  { value: 'USD', label: '$ Dólares' },
  { value: 'EUR', label: '€ Euros' },
] as const;

/** Segment values are strings, so week starts travel as their `getDay()` number in text. */
export const weekStarts = [
  { value: '1', label: 'Lunes' },
  { value: '0', label: 'Domingo' },
] as const;

export function weekStartOf(value: string): WeekStart {
  return value === '0' ? 0 : 1;
}

/** A stored currency outside the offered list falls back to the first. */
export function currencyChoice(code: string): (typeof currencies)[number]['value'] {
  return currencies.find((currency) => currency.value === code)?.value ?? 'PEN';
}
