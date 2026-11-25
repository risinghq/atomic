import type { Every, WeekStart } from '@atomic/core';

/** How often a new transaction repeats. Daily repeats are left out: nobody pays rent daily. */
export const repeats = [
  { value: 'never', label: 'No' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
  { value: 'year', label: 'Anual' },
] as const satisfies readonly { value: Every | 'never'; label: string }[];

export type Repeat = (typeof repeats)[number]['value'];

/** "Cada semana", for a recurring transaction's line. */
export const everyLabel: Record<Every, string> = {
  day: 'Cada día',
  week: 'Cada semana',
  month: 'Cada mes',
  year: 'Cada año',
};

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
