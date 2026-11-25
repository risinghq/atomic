import {
  budgetStatus,
  periodOf,
  totalIn,
  type Budget,
  type Settings,
  type Store,
  type Transaction,
} from '@rising/core';
import { budgetLine, formatMoney, periodTitle } from '../format';

/** The three lines the home-screen widget shows. */
export type WidgetSummary = {
  label: string;
  amount: string;
  detail: string;
};

/** What the widget is drawn from. Transactions outside its period are ignored. */
export type WidgetData = {
  transactions: readonly Transaction[];
  budgets: readonly Budget[];
  settings: Settings;
};

function overallBudget(budgets: readonly Budget[]): Budget | undefined {
  return budgets.find((budget) => budget.categoryId === null);
}

/**
 * What was spent in the overall budget's period, and what is left per day; with
 * no overall budget, what was spent this month.
 */
export function widgetSummary(
  { transactions, budgets, settings }: WidgetData,
  now: Date
): WidgetSummary {
  const overall = overallBudget(budgets);
  const period = periodOf(overall?.period ?? 'month', now, settings.weekStart);
  const label = period.kind === 'week' ? 'Gastado esta semana' : 'Gastado este mes';

  if (!overall) {
    return {
      label,
      amount: formatMoney(totalIn(transactions, period), settings.currency),
      detail: periodTitle(period, now, settings.weekStart),
    };
  }

  const status = budgetStatus(overall, transactions, now, settings.weekStart);

  return {
    label,
    amount: formatMoney(status.spent, settings.currency),
    detail: budgetLine(status, settings.currency, now),
  };
}

/** Reads from the store only what the summary needs: the transactions of its period. */
export async function readWidgetData(store: Store, now: Date): Promise<WidgetData> {
  const [budgets, settings] = await Promise.all([store.budgets(), store.settings()]);
  const period = periodOf(overallBudget(budgets)?.period ?? 'month', now, settings.weekStart);

  return { transactions: await store.transactions(period), budgets, settings };
}
