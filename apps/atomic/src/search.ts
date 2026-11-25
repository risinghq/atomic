import { fromCents, type Transaction } from '@rising/core';

/** Lowercase, without accents, so "cafe" finds "Café". */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * The transactions a search finds. Every word must appear in the note or the
 * category name; a number also finds the amounts that contain it, so "12"
 * finds 12.00 and 112.50. A blank search finds everything.
 */
export function search(
  transactions: readonly Transaction[],
  nameOf: (categoryId: string) => string,
  query: string
): readonly Transaction[] {
  const words = fold(query).split(/\s+/).filter(Boolean);

  if (words.length === 0) return transactions;

  return transactions.filter((transaction) => {
    const text = fold(`${transaction.note} ${nameOf(transaction.categoryId)}`);
    const amount = fromCents(transaction.amount).toFixed(2);

    return words.every((word) => text.includes(word) || amount.includes(word.replace(',', '.')));
  });
}
