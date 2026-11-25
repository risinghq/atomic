import { beforeEach, describe, expect, it } from 'vitest';
import { defaultCategories, migrations, openStore, periodOf, type Store } from '../src';
import { memoryDatabase } from '../testing/memory-database';

let store: Store;
let db: ReturnType<typeof memoryDatabase>;

beforeEach(async () => {
  let next = 0;

  db = memoryDatabase();
  store = await openStore(db, { newId: () => `id-${(next += 1)}` });
});

describe('opening', () => {
  it('migrates to the latest version once', async () => {
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);

    expect(version?.user_version).toBe(migrations.length);
    await expect(openStore(db, { newId: () => 'again' })).resolves.toBeDefined();
  });

  it('starts empty, with default settings', async () => {
    expect(await store.categories()).toEqual([]);
    expect(await store.settings()).toEqual({
      weekStart: 1,
      currency: 'PEN',
      onboarded: false,
      haptics: true,
      lock: false,
    });
  });
});

describe('categories', () => {
  it('seeds the defaults only into an empty table', async () => {
    await store.seedCategories();
    await store.seedCategories();

    expect(await store.categories()).toHaveLength(defaultCategories.length);
  });

  it('adds at the end and hides archived ones from the default list', async () => {
    await store.seedCategories();

    const pets = await store.addCategory({
      name: 'Mascotas',
      emoji: '🐶',
      color: '#FF9F43',
      kind: 'expense',
    });

    expect(pets.position).toBe(defaultCategories.length);

    await store.updateCategory({ ...pets, archived: true });

    expect((await store.categories()).some((category) => category.id === pets.id)).toBe(false);
    expect((await store.categories({ archived: true })).at(-1)).toMatchObject({
      id: pets.id,
      archived: true,
    });
  });
});

describe('transactions', () => {
  beforeEach(() => store.seedCategories());

  it('lists newest first, inside a span when given one', async () => {
    const march = periodOf('month', new Date(2026, 2, 1));
    const early = await store.addTransaction({
      kind: 'expense',
      amount: 1250,
      categoryId: 'food',
      note: 'Menú',
      at: new Date(2026, 2, 2).getTime(),
    });
    const late = await store.addTransaction({
      kind: 'income',
      amount: 500000,
      categoryId: 'salary',
      note: '',
      at: new Date(2026, 2, 30).getTime(),
    });

    await store.addTransaction({ ...early, at: new Date(2026, 3, 1).getTime() });

    expect((await store.transactions(march)).map((t) => t.id)).toEqual([late.id, early.id]);
    expect(await store.transactions()).toHaveLength(3);
  });

  it('updates and deletes', async () => {
    const taxi = await store.addTransaction({
      kind: 'expense',
      amount: 1500,
      categoryId: 'transport',
      note: 'Taxi',
      at: 1,
    });

    await store.updateTransaction({ ...taxi, amount: 1800 });
    expect((await store.transactions())[0]?.amount).toBe(1800);

    await store.deleteTransaction(taxi.id);
    expect(await store.transactions()).toEqual([]);
  });

  it('refuses an unknown category or a non-positive amount', async () => {
    const base = { kind: 'expense' as const, note: '', at: 1 };

    await expect(
      store.addTransaction({ ...base, amount: 100, categoryId: 'nope' })
    ).rejects.toThrow();
    await expect(
      store.addTransaction({ ...base, amount: 0, categoryId: 'food' })
    ).rejects.toThrow();
  });
});

describe('budgets', () => {
  beforeEach(() => store.seedCategories());

  it('keeps one budget per category and one overall, overall first', async () => {
    await store.setBudget({ categoryId: 'food', amount: 50000, period: 'month' });
    await store.setBudget({ categoryId: 'food', amount: 20000, period: 'week' });
    await store.setBudget({ categoryId: null, amount: 150000, period: 'month' });

    const budgets = await store.budgets();

    expect(
      budgets.map(({ categoryId, amount, period }) => ({ categoryId, amount, period }))
    ).toEqual([
      { categoryId: null, amount: 150000, period: 'month' },
      { categoryId: 'food', amount: 20000, period: 'week' },
    ]);

    await store.deleteBudget(budgets[0]?.id ?? '');
    expect(await store.budgets()).toHaveLength(1);
  });
});

describe('importRecords', () => {
  it('writes more rows than one statement holds', async () => {
    const many = Array.from({ length: 1201 }, (_, index) => ({
      id: `t${index}`,
      kind: 'expense' as const,
      amount: 100,
      categoryId: 'food',
      note: '',
      at: index,
    }));

    await store.importRecords({ transactions: many, budgets: [], settings: {} });

    expect(await store.transactions()).toHaveLength(1201);
  });
});

describe('settings and erasing', () => {
  it('stores settings by key and merges them over the defaults', async () => {
    await store.updateSettings({ currency: 'USD' });

    expect(await store.updateSettings({ weekStart: 0 })).toEqual({
      weekStart: 0,
      currency: 'USD',
      onboarded: false,
      haptics: true,
      lock: false,
    });
  });

  it('erases every record and setting', async () => {
    await store.seedCategories();
    await store.addTransaction({ kind: 'expense', amount: 1, categoryId: 'food', note: '', at: 1 });
    await store.setBudget({ categoryId: null, amount: 100, period: 'week' });
    await store.updateSettings({ onboarded: true });

    await store.eraseAll();

    expect(await store.categories({ archived: true })).toEqual([]);
    expect(await store.transactions()).toEqual([]);
    expect(await store.budgets()).toEqual([]);
    expect((await store.settings()).onboarded).toBe(false);
  });
});
