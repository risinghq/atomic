import type { Category, Transaction } from '@atomic/core';
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

/** The file name for an export made at `now`, such as `atomic-2026-11-25.csv`. */
export function csvName(now: Date) {
  return `atomic-${localStamp(now.getTime()).slice(0, 10)}.csv`;
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
