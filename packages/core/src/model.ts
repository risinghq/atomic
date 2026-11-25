import type { Cents } from './money';

export type Kind = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  emoji: string;
  /** A `#RRGGBB` color. */
  color: string;
  kind: Kind;
  /** Order in pickers and lists, ascending. */
  position: number;
  /** An archived category keeps its transactions but leaves the pickers. */
  archived: boolean;
};

export type Transaction = {
  id: string;
  kind: Kind;
  /** Always positive; `kind` gives the direction. */
  amount: Cents;
  categoryId: string;
  note: string;
  /** Epoch milliseconds. */
  at: number;
};

export type BudgetPeriod = 'week' | 'month';

export type Budget = {
  id: string;
  /** Null for the overall budget, which counts every expense. */
  categoryId: string | null;
  amount: Cents;
  period: BudgetPeriod;
};

/** The first day of a week, as `Date.getDay()` numbers it: 0 Sunday, 1 Monday. */
export type WeekStart = 0 | 1;

export type Settings = {
  weekStart: WeekStart;
  /** An ISO 4217 code. */
  currency: string;
  onboarded: boolean;
};

export const defaultSettings: Settings = {
  weekStart: 1,
  currency: 'PEN',
  onboarded: false,
};
