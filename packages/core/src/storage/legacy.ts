import { defaultCategories, fallbackCategoryId } from '../categories';
import type { Budget, Kind, Transaction } from '../model';
import { toCents } from '../money';
import type { ImportRecords, Store } from './store';

/** The AsyncStorage calls the import needs. */
export interface LegacyStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

// The keys and shapes the AsyncStorage version of the app wrote.
export const legacyKeys = ['user', 'transactions', 'budgetCategories'] as const;

type LegacyUser = { settings?: { currency?: unknown } };

type LegacyTransaction = {
  id?: unknown;
  amount?: unknown;
  description?: unknown;
  category?: unknown;
  date?: unknown;
  type?: unknown;
};

type LegacyBudget = { id?: unknown; categoryId?: unknown; budgeted?: unknown };

const knownIds = new Set(defaultCategories.map((category) => category.id));

/**
 * Converts the old app's records to the current model, or returns null when
 * it left none. A record that cannot be read is dropped, not guessed at.
 */
export function convertLegacy(
  user: LegacyUser | null,
  transactions: readonly LegacyTransaction[],
  budgets: readonly LegacyBudget[]
): ImportRecords | null {
  if (!user && transactions.length === 0) return null;

  const currency = user?.settings?.currency;

  return {
    transactions: transactions.flatMap((record) => {
      const converted = convertTransaction(record);
      return converted ? [converted] : [];
    }),
    budgets: convertBudgets(budgets),
    settings: {
      onboarded: true,
      ...(typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? { currency } : {}),
    },
  };
}

function convertTransaction(record: LegacyTransaction): Transaction | null {
  const kind: Kind = record.type === 'income' ? 'income' : 'expense';
  const amount = typeof record.amount === 'number' ? Math.abs(toCents(record.amount)) : Number.NaN;
  const at = typeof record.date === 'string' ? Date.parse(record.date) : Number.NaN;

  if (typeof record.id !== 'string' || !(amount > 0) || Number.isNaN(at)) return null;

  return {
    id: record.id,
    kind,
    amount,
    categoryId: knownCategory(record.category, kind),
    note: typeof record.description === 'string' ? record.description.trim() : '',
    at,
  };
}

// The old app kept one monthly budget per expense category.
function convertBudgets(records: readonly LegacyBudget[]): Budget[] {
  const byCategory = new Map<string, Budget>();

  for (const record of records) {
    const amount = typeof record.budgeted === 'number' ? toCents(record.budgeted) : Number.NaN;
    const categoryId = record.categoryId;

    if (typeof record.id !== 'string' || !(amount > 0)) continue;
    if (typeof categoryId !== 'string' || !knownIds.has(categoryId)) continue;
    if (byCategory.has(categoryId)) continue;

    byCategory.set(categoryId, { id: record.id, categoryId, amount, period: 'month' });
  }

  return [...byCategory.values()];
}

function knownCategory(id: unknown, kind: Kind): string {
  return typeof id === 'string' && knownIds.has(id) ? id : fallbackCategoryId[kind];
}

/**
 * Moves the old app's AsyncStorage records into the store, then deletes the
 * old keys so they are never imported twice. Returns how many transactions it
 * found. The store skips records it already has, so an import interrupted
 * before the keys were deleted repeats safely.
 */
export async function importLegacy(store: Store, storage: LegacyStorage): Promise<number> {
  const [user, transactions, budgets] = await Promise.all(
    legacyKeys.map(async (key) => parse(await storage.getItem(key)))
  );
  const records = convertLegacy(
    (user as LegacyUser | null) ?? null,
    asArray(transactions),
    asArray(budgets)
  );

  if (records) await store.importRecords(records);

  await Promise.all(legacyKeys.map((key) => storage.removeItem(key)));

  return records?.transactions.length ?? 0;
}

function parse(text: string | null): unknown {
  if (text === null) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
