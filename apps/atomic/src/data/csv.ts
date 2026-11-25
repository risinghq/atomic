import {
  contains,
  periodOf,
  shiftPeriod,
  type Category,
  type Period,
  type Span,
  type Transaction,
  type WeekStart,
} from '@rising/core';
import { periodTitle } from '../format';
import { categoryOf } from './DataProvider';

const header = ['fecha', 'tipo', 'categoría', 'nota', 'monto'];

const kinds = { expense: 'gasto', income: 'ingreso' } as const;

/** Excel reads a file as UTF-8 only when it starts with a byte order mark. */
export const bom = String.fromCodePoint(0xfe_ff);

/** Every transaction as RFC 4180 CSV, oldest first, amounts with a dot decimal. */
export function toCsv(transactions: readonly Transaction[], categories: readonly Category[]) {
  const sorted = [...transactions].sort((a, b) => a.at - b.at);

  const rows = sorted.map((transaction) => [
    localStamp(transaction.at),
    kinds[transaction.kind],
    categoryOf(categories, transaction.categoryId).name,
    transaction.note,
    decimal(transaction.amount),
  ]);

  const lines = [header, ...rows].map((row) => row.map(field).join(','));

  return bom + lines.join('\r\n') + '\r\n';
}

/** The file name for an export of everything made at `now`, such as `atomic-2026-11-25.csv`. */
export function csvName(now: Date) {
  return `atomic-${localStamp(now.getTime()).slice(0, 10)}.csv`;
}

/** What Exportar CSV offers: one period's transactions, or all of them. */
export type ExportChoice = {
  title: string;
  /** The period in words, such as "Noviembre 2026"; none for everything. */
  detail?: string;
  /** None exports every transaction. */
  span?: Span;
  file: string;
};

/** This month, last month, this year and everything, named for the period each covers. */
export function exportChoices(now: Date, weekStart: WeekStart): ExportChoice[] {
  const month = periodOf('month', now, weekStart);
  const lastMonth = shiftPeriod(month, -1);
  const year = periodOf('year', now, weekStart);

  const choice = (title: string, period: Period): ExportChoice => ({
    title,
    detail: periodTitle(period, now, weekStart),
    span: period,
    file: `atomic-${periodStamp(period)}.csv`,
  });

  return [
    choice('Este mes', month),
    choice('Mes pasado', lastMonth),
    choice('Este año', year),
    { title: 'Todo', file: csvName(now) },
  ];
}

/** The transactions an export covers. */
export function exported(transactions: readonly Transaction[], choice: ExportChoice) {
  const { span } = choice;

  return span ? transactions.filter((transaction) => contains(span, transaction.at)) : transactions;
}

function periodStamp(period: Period) {
  const start = new Date(period.start);
  const year = String(start.getFullYear());

  return period.kind === 'year' ? year : `${year}-${pad(start.getMonth() + 1)}`;
}

function field(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function decimal(cents: number) {
  return `${Math.trunc(cents / 100)}.${pad(cents % 100)}`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** `YYYY-MM-DD HH:mm` in local time. */
function localStamp(at: number) {
  const date = new Date(at);

  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return `${day} ${time}`;
}
