import { beforeEach, describe, expect, it } from 'vitest';
import { convertLegacy, importLegacy, openStore, type LegacyStorage, type Store } from '../src';
import { memoryDatabase } from '../testing/memory-database';

const user = { id: 'u', name: 'Ana', settings: { currency: 'USD' } };

const transactions = [
  {
    id: 't1',
    amount: 12.5,
    description: ' Menú ',
    category: 'food',
    date: '2026-03-02T17:00:00.000Z',
    type: 'expense',
  },
  {
    id: 't2',
    amount: -1.005,
    description: 'Bus',
    category: 'transport',
    date: '2026-03-03T12:00:00.000Z',
    type: 'expense',
  },
  {
    id: 't3',
    amount: 3000,
    description: '',
    category: 'bonus',
    date: '2026-03-04T12:00:00.000Z',
    type: 'income',
  },
  {
    id: 't4',
    amount: 0,
    description: 'zero',
    category: 'food',
    date: '2026-03-04T12:00:00.000Z',
    type: 'expense',
  },
  {
    id: 't5',
    amount: 5,
    description: 'bad date',
    category: 'food',
    date: 'yesterday',
    type: 'expense',
  },
];

const budgets = [
  { id: 'b1', categoryId: 'food', budgeted: 400, userId: 'u' },
  { id: 'b2', categoryId: 'food', budgeted: 900, userId: 'u' },
  { id: 'b3', categoryId: 'unknown', budgeted: 50, userId: 'u' },
];

function memoryStorage(items: Record<string, unknown>): LegacyStorage & { keys(): string[] } {
  const data = new Map(Object.entries(items).map(([key, value]) => [key, JSON.stringify(value)]));

  return {
    async getItem(key) {
      return data.get(key) ?? null;
    },

    async removeItem(key) {
      data.delete(key);
    },

    keys: () => [...data.keys()],
  };
}

describe('convertLegacy', () => {
  it('returns null when the old app left nothing', () => {
    expect(convertLegacy(null, [], [])).toBeNull();
  });

  it('converts amounts to cents, maps categories and drops unreadable records', () => {
    const records = convertLegacy(user, transactions, budgets);

    expect(records?.transactions).toEqual([
      {
        id: 't1',
        kind: 'expense',
        amount: 1250,
        categoryId: 'food',
        note: 'Menú',
        at: Date.parse('2026-03-02T17:00:00.000Z'),
      },
      {
        id: 't2',
        kind: 'expense',
        amount: 101,
        categoryId: 'transport',
        note: 'Bus',
        at: Date.parse('2026-03-03T12:00:00.000Z'),
      },
      {
        id: 't3',
        kind: 'income',
        amount: 300000,
        categoryId: 'other-income',
        note: '',
        at: Date.parse('2026-03-04T12:00:00.000Z'),
      },
    ]);
    expect(records?.budgets).toEqual([
      { id: 'b1', categoryId: 'food', amount: 40000, period: 'month' },
    ]);
    expect(records?.settings).toEqual({ onboarded: true, currency: 'USD' });
  });
});

describe('importLegacy', () => {
  let store: Store;

  beforeEach(async () => {
    store = await openStore(memoryDatabase(), { newId: () => crypto.randomUUID() });
  });

  it('moves the records into the store and deletes the old keys', async () => {
    const storage = memoryStorage({ user, transactions, budgetCategories: budgets, other: 1 });

    expect(await importLegacy(store, storage)).toBe(3);
    expect(await store.transactions()).toHaveLength(3);
    expect(await store.budgets()).toHaveLength(1);
    expect(await store.settings()).toMatchObject({ onboarded: true, currency: 'USD' });
    expect(storage.keys()).toEqual(['other']);
  });

  it('repeats safely when the keys outlived an earlier import', async () => {
    const records = { user, transactions, budgetCategories: budgets };

    await importLegacy(store, memoryStorage(records));
    await importLegacy(store, memoryStorage(records));

    expect(await store.transactions()).toHaveLength(3);
  });

  it('leaves a fresh install untouched', async () => {
    expect(await importLegacy(store, memoryStorage({}))).toBe(0);
    expect(await store.categories()).toEqual([]);
  });
});
