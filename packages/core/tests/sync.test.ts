import { describe, expect, it } from 'vitest';
import { countChanges, migrations, noChanges, openStore, type Changes, type Store } from '../src';
import { memoryDatabase } from '../testing/memory-database';

type Kept = { table: keyof Changes; key: string; record: { updatedAt: number }; seq: number };

/**
 * A server with the sync contract the store expects: it keeps the newer copy
 * of each record and hands back everything stored past the cursor.
 */
function referenceServer() {
  const kept = new Map<string, Kept>();
  let seq = 0;

  return {
    sync(cursor: string | null, changes: Changes): { pulled: Changes; cursor: string } {
      for (const table of Object.keys(changes) as (keyof Changes)[]) {
        for (const record of changes[table]) {
          const key = 'id' in record ? record.id : record.key;
          const known = kept.get(`${table}:${key}`);

          if (known && known.record.updatedAt >= record.updatedAt) continue;

          seq += 1;
          kept.set(`${table}:${key}`, { table, key, record, seq });
        }
      }

      const after = Number(cursor ?? 0);
      const pulled = noChanges();

      for (const entry of kept.values()) {
        if (entry.seq > after) (pulled[entry.table] as unknown[]).push(entry.record);
      }

      return { pulled, cursor: String(seq) };
    },
  };
}

type Device = { store: Store; tick: (at: number) => void };

async function device(name: string): Promise<Device> {
  let clock = 0;
  let next = 0;
  const store = await openStore(memoryDatabase(), {
    newId: () => `${name}-${(next += 1)}`,
    now: () => clock,
  });

  await store.seedCategories();

  return { store, tick: (at) => (clock = at) };
}

async function sync(server: ReturnType<typeof referenceServer>, { store }: Device) {
  const pushed = await store.pendingChanges();
  const { pulled, cursor } = server.sync(await store.syncCursor(), pushed);

  await store.completeSync({ pushed, pulled, cursor });
}

const lunch = { kind: 'expense' as const, amount: 1800, categoryId: 'food', note: 'Menú', at: 5 };

describe('sync', () => {
  it('has nothing to send on a fresh device', async () => {
    const phone = await device('phone');

    expect(countChanges(await phone.store.pendingChanges())).toBe(0);
  });

  it('brings an expense from one device to another', async () => {
    const server = referenceServer();
    const phone = await device('phone');
    const tablet = await device('tablet');

    phone.tick(100);
    const added = await phone.store.addTransaction(lunch);

    await sync(server, phone);
    await sync(server, tablet);

    expect(await tablet.store.transactions()).toEqual([added]);
    expect(countChanges(await phone.store.pendingChanges())).toBe(0);
  });

  it('keeps the later of two edits on both devices', async () => {
    const server = referenceServer();
    const phone = await device('phone');
    const tablet = await device('tablet');

    phone.tick(100);
    const added = await phone.store.addTransaction(lunch);
    await sync(server, phone);
    await sync(server, tablet);

    tablet.tick(300);
    await tablet.store.updateTransaction({ ...added, amount: 2500 });
    phone.tick(200);
    await phone.store.updateTransaction({ ...added, amount: 2000 });

    await sync(server, phone);
    await sync(server, tablet);
    await sync(server, phone);

    expect((await phone.store.transactions())[0]?.amount).toBe(2500);
    expect((await tablet.store.transactions())[0]?.amount).toBe(2500);
  });

  it('carries a deletion to the other device', async () => {
    const server = referenceServer();
    const phone = await device('phone');
    const tablet = await device('tablet');

    phone.tick(100);
    const added = await phone.store.addTransaction(lunch);
    await sync(server, phone);
    await sync(server, tablet);

    tablet.tick(200);
    await tablet.store.deleteTransaction(added.id);
    await sync(server, tablet);
    await sync(server, phone);

    expect(await phone.store.transactions()).toEqual([]);
  });

  it('gives a category the same budget on every device', async () => {
    const server = referenceServer();
    const phone = await device('phone');
    const tablet = await device('tablet');

    phone.tick(100);
    await phone.store.setBudget({ categoryId: 'food', amount: 50000, period: 'month' });
    tablet.tick(200);
    await tablet.store.setBudget({ categoryId: 'food', amount: 30000, period: 'week' });

    await sync(server, phone);
    await sync(server, tablet);
    await sync(server, phone);

    const expected = [{ id: 'budget:food', categoryId: 'food', amount: 30000, period: 'week' }];

    expect(await phone.store.budgets()).toEqual(expected);
    expect(await tablet.store.budgets()).toEqual(expected);
  });

  it('shares the currency but not the onboarding flag', async () => {
    const server = referenceServer();
    const phone = await device('phone');
    const tablet = await device('tablet');

    phone.tick(100);
    await phone.store.updateSettings({ currency: 'USD', onboarded: true });
    await sync(server, phone);
    await sync(server, tablet);

    expect(await tablet.store.settings()).toMatchObject({ currency: 'USD', onboarded: false });
  });

  it('sends an edit made while a sync was running on the next sync', async () => {
    const server = referenceServer();
    const phone = await device('phone');

    phone.tick(100);
    const added = await phone.store.addTransaction(lunch);
    const pushed = await phone.store.pendingChanges();
    const { pulled, cursor } = server.sync(null, pushed);

    phone.tick(200);
    await phone.store.updateTransaction({ ...added, note: 'Almuerzo' });
    await phone.store.completeSync({ pushed, pulled, cursor });

    expect((await phone.store.transactions())[0]?.note).toBe('Almuerzo');
    expect((await phone.store.pendingChanges()).transactions).toMatchObject([
      { note: 'Almuerzo', updatedAt: 200 },
    ]);
  });

  it('hands everything to the next account after leaving one', async () => {
    const work = referenceServer();
    const home = referenceServer();
    const phone = await device('phone');

    phone.tick(100);
    const added = await phone.store.addTransaction(lunch);
    await phone.store.updateSettings({ currency: 'USD' });
    await sync(work, phone);

    await phone.store.forgetSync();
    await sync(home, phone);

    const tablet = await device('tablet');

    await sync(home, tablet);

    expect(await tablet.store.transactions()).toEqual([added]);
    expect(await tablet.store.settings()).toMatchObject({ currency: 'USD' });
  });

  it('marks records saved before sync existed as unsent', async () => {
    const db = memoryDatabase();

    await db.execAsync(migrations[0] ?? '');
    await db.execAsync(`
      PRAGMA user_version = 1;
      INSERT INTO categories VALUES ('food', 'Comida', '🍔', '#FF6B6B', 'expense', 0, 0);
      INSERT INTO transactions VALUES ('t1', 'expense', 1800, 'food', '', 5);
      INSERT INTO budgets VALUES ('old-id', 'food', 50000, 'month');
      INSERT INTO settings VALUES ('currency', '"USD"');
    `);

    const store = await openStore(db, { newId: () => 'unused' });
    const pending = await store.pendingChanges();

    expect(pending.transactions.map((record) => record.id)).toEqual(['t1']);
    expect(pending.budgets.map((record) => record.id)).toEqual(['budget:food']);
    expect(pending.settings).toEqual([{ key: 'currency', value: '"USD"', updatedAt: 0 }]);
  });
});

const january = (date: number) => new Date(2026, 0, date, 9).getTime();

const dates = async ({ store }: Device) =>
  (await store.transactions()).map((transaction) => transaction.at);

describe('recurring transactions', () => {
  const rent = {
    kind: 'expense' as const,
    amount: 120_000,
    categoryId: 'home',
    note: 'Alquiler',
    every: 'week' as const,
    start: january(1),
  };

  it('records each due occurrence once, the same one on every device', async () => {
    const server = referenceServer();
    const phone = await device('phone');
    const tablet = await device('tablet');

    phone.tick(january(1));
    await phone.store.addRecurring(rent);
    await sync(server, phone);

    tablet.tick(january(16));
    await sync(server, tablet);
    expect(await tablet.store.applyRecurring()).toBe(3);
    expect(await tablet.store.applyRecurring()).toBe(0);
    await sync(server, tablet);

    phone.tick(january(16));
    expect(await phone.store.applyRecurring()).toBe(2);
    await sync(server, phone);

    const recorded = [january(15), january(8), january(1)];

    expect(await dates(phone)).toEqual(recorded);
    expect(await dates(tablet)).toEqual(recorded);
  });

  it('keeps an occurrence deleted when another device records it later', async () => {
    const server = referenceServer();
    const phone = await device('phone');
    const tablet = await device('tablet');

    phone.tick(january(1));
    await phone.store.addRecurring(rent);
    await sync(server, phone);
    await sync(server, tablet);

    phone.tick(january(9));
    await phone.store.applyRecurring();
    const [latest] = await phone.store.transactions();
    await phone.store.deleteTransaction(latest!.id);
    await sync(server, phone);

    tablet.tick(january(10));
    await tablet.store.applyRecurring();
    await sync(server, tablet);
    await sync(server, phone);

    expect(await dates(phone)).toEqual([january(1)]);
    expect(await dates(tablet)).toEqual([january(1)]);
  });

  it('stops recording once deleted and keeps what it recorded', async () => {
    const phone = await device('phone');

    phone.tick(january(1));
    const rule = await phone.store.addRecurring(rent);
    await phone.store.deleteRecurring(rule.id);

    phone.tick(january(30));
    expect(await phone.store.applyRecurring()).toBe(0);
    expect(await phone.store.recurring()).toEqual([]);
    expect(await dates(phone)).toEqual([january(1)]);
  });
});
