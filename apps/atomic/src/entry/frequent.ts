import type { Category, Kind, Transaction } from '@atomic/core';

/** An entry the person records often enough to offer it in one tap. */
export type Frequent = Pick<Transaction, 'kind' | 'amount' | 'categoryId' | 'note'>;

const lookBack = 90 * 24 * 60 * 60 * 1000;

/**
 * The entries of `kind` recorded at least twice in the last 90 days with the
 * same amount, category and note, most repeated first and the latest breaking
 * a tie. A transaction in an archived category is never offered.
 */
export function frequentEntries(
  transactions: readonly Transaction[],
  categories: readonly Category[],
  kind: Kind,
  now: number,
  limit = 3
): Frequent[] {
  const active = new Set(
    categories.filter((category) => category.kind === kind && !category.archived).map((c) => c.id)
  );
  const groups = new Map<string, { entry: Frequent; count: number; latest: number }>();

  for (const transaction of transactions) {
    if (transaction.kind !== kind || !active.has(transaction.categoryId)) continue;
    if (transaction.at < now - lookBack) continue;

    const note = transaction.note.trim();
    const key = `${transaction.amount}|${transaction.categoryId}|${note.toLowerCase()}`;
    const group = groups.get(key);

    if (group) {
      group.count += 1;
      group.latest = Math.max(group.latest, transaction.at);
      continue;
    }

    groups.set(key, {
      entry: { kind, amount: transaction.amount, categoryId: transaction.categoryId, note },
      count: 1,
      latest: transaction.at,
    });
  }

  return [...groups.values()]
    .filter((group) => group.count >= 2)
    .sort((a, b) => b.count - a.count || b.latest - a.latest)
    .slice(0, limit)
    .map((group) => group.entry);
}
