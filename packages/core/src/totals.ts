import type { Cents } from './money';
import type { Budget, Kind, Transaction, WeekStart } from './model';
import { contains, elapsedShare, periodOf, type Period, type Span } from './period';

/** The sum of one kind of transaction inside the span. */
export function totalIn(
  transactions: readonly Transaction[],
  span: Span,
  kind: Kind = 'expense',
  categoryId?: string
): Cents {
  let total = 0;

  for (const transaction of transactions) {
    if (transaction.kind !== kind || !contains(span, transaction.at)) continue;
    if (categoryId !== undefined && transaction.categoryId !== categoryId) continue;

    total += transaction.amount;
  }

  return total;
}

export type CategoryTotal = { categoryId: string; total: Cents };

/** Totals per category inside the span, largest first. */
export function totalsByCategory(
  transactions: readonly Transaction[],
  span: Span,
  kind: Kind = 'expense'
): CategoryTotal[] {
  const totals = new Map<string, Cents>();

  for (const transaction of transactions) {
    if (transaction.kind !== kind || !contains(span, transaction.at)) continue;

    totals.set(
      transaction.categoryId,
      (totals.get(transaction.categoryId) ?? 0) + transaction.amount
    );
  }

  return [...totals]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .toSorted((a, b) => b.total - a.total);
}

/** One total per bucket, in bucket order. */
export function totalsByBucket(
  transactions: readonly Transaction[],
  buckets: readonly Span[],
  kind: Kind = 'expense'
): Cents[] {
  return buckets.map((bucket) => totalIn(transactions, bucket, kind));
}

export type BudgetStatus = {
  period: Period;
  spent: Cents;
  /** What is left to spend; negative once the budget is exceeded. */
  left: Cents;
  /** Spent over amount; above 1 once exceeded. */
  share: number;
  /** How much of the period has passed, for the meter's pace tick. */
  elapsed: number;
  over: boolean;
};

/** Where a budget stands in the period that contains `now`. */
export function budgetStatus(
  budget: Budget,
  transactions: readonly Transaction[],
  now: Date,
  weekStart: WeekStart
): BudgetStatus {
  const period = periodOf(budget.period, now, weekStart);
  const spent = totalIn(transactions, period, 'expense', budget.categoryId ?? undefined);
  const share = budget.amount > 0 ? spent / budget.amount : spent > 0 ? 1 : 0;

  return {
    period,
    spent,
    left: budget.amount - spent,
    share,
    elapsed: elapsedShare(period, now),
    over: spent > budget.amount,
  };
}
