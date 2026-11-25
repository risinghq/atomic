import {
  bucketsOf,
  fromCents,
  periodOf,
  samePeriod,
  type BudgetStatus,
  type Cents,
  type Period,
  type Span,
  type Transaction,
  type WeekStart,
} from '@atomic/core';

const locale = 'es-PE';

const DAY = 24 * 60 * 60 * 1000;

/** Money as one string, for status lines and labels: "S/ 18.50". */
export function formatMoney(cents: Cents, currency: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(fromCents(cents));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function startOfDay(at: number | Date): Date {
  const date = new Date(at);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** "Hoy", "Ayer", "Lunes 23 nov", or with the year when it is not this one. */
export function dayTitle(at: number, now: Date): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(at).getTime()) / DAY);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';

  const date = new Date(at);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  const title = `${capitalize(weekday)} ${date.getDate()} ${shortMonth(date)}`;

  return date.getFullYear() === now.getFullYear() ? title : `${title} ${date.getFullYear()}`;
}

/** "nov": ICU versions differ on the case and the trailing dot, so both are fixed here. */
function shortMonth(date: Date): string {
  const month = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);

  return month.replace('.', '').toLowerCase();
}

/** The clock time of a transaction: "13:05". */
export function timeLabel(at: number): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(at));
}

/** The title a period picker shows: "Esta semana", "18 – 24 nov", "Noviembre 2026", "2026". */
export function periodTitle(period: Period, now: Date, weekStart: WeekStart): string {
  const current = samePeriod(period, periodOf(period.kind, now, weekStart));
  const start = new Date(period.start);

  if (period.kind === 'year') return String(start.getFullYear());

  if (period.kind === 'month') {
    const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(start);
    return capitalize(`${month} ${start.getFullYear()}`);
  }

  if (current) return 'Esta semana';

  const last = new Date(period.end.getTime() - 1);
  const startMonth = shortMonth(start);
  const lastMonth = shortMonth(last);

  return startMonth === lastMonth
    ? `${start.getDate()} – ${last.getDate()} ${lastMonth}`
    : `${start.getDate()} ${startMonth} – ${last.getDate()} ${lastMonth}`;
}

/** The short label under a chart bar: a weekday letter, a day number or a month letter. */
export function bucketLabel(bucket: Span, kind: Period['kind']): string {
  const start = new Date(bucket.start);

  if (kind === 'week') {
    return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(start).toUpperCase();
  }

  if (kind === 'month') return String(start.getDate());

  return new Intl.DateTimeFormat(locale, { month: 'narrow' }).format(start).toUpperCase();
}

/** How many days of a week or month are left, today included. */
export function daysLeft(period: Period, now: Date): number {
  return bucketsOf(period).filter((day) => day.end > now).length;
}

/** The line under a budget: what is left per day, or when an overspent budget renews. */
export function budgetLine(status: BudgetStatus, currency: string, now: Date): string {
  const days = daysLeft(status.period, now);

  if (status.over) {
    return days === 1 ? 'Se renueva mañana' : `Se renueva en ${days} días`;
  }

  return `${formatMoney(Math.floor(status.left / days), currency)} por día`;
}

export type Day = {
  key: string;
  at: number;
  /** Income minus expenses, in cents. */
  net: Cents;
  transactions: Transaction[];
};

/** Splits transactions, newest first, into calendar days, newest first. */
export function groupByDay(transactions: readonly Transaction[]): Day[] {
  const days: Day[] = [];

  for (const transaction of transactions) {
    const start = startOfDay(transaction.at).getTime();
    const signed = transaction.kind === 'income' ? transaction.amount : -transaction.amount;
    const last = days.at(-1);

    if (last && last.at === start) {
      last.net += signed;
      last.transactions.push(transaction);
      continue;
    }

    days.push({ key: String(start), at: start, net: signed, transactions: [transaction] });
  }

  return days;
}
