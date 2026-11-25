import type { Database } from './database';

// Each entry moves the schema one version forward. Append; never edit an entry
// that has shipped, because installed databases have already run it.
export const migrations: readonly string[] = [
  `
  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
    position INTEGER NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    category_id TEXT NOT NULL REFERENCES categories (id),
    note TEXT NOT NULL DEFAULT '',
    at INTEGER NOT NULL
  );

  CREATE INDEX transactions_at ON transactions (at);

  CREATE TABLE budgets (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT REFERENCES categories (id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    period TEXT NOT NULL CHECK (period IN ('week', 'month'))
  );

  -- One budget per category, and one overall budget (a null category).
  CREATE UNIQUE INDEX budgets_category ON budgets (ifnull(category_id, ''));

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,

  // Sync: every record carries when it last changed, a tombstone and whether
  // this device still has to send it. Records from before sync are all unsent.
  // A budget's id becomes `budgetId(category)`, so devices agree on it.
  `
  ALTER TABLE categories ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE categories ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE categories ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;

  ALTER TABLE transactions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE transactions ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE transactions ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;

  ALTER TABLE budgets ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE budgets ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE budgets ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;

  ALTER TABLE settings ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE settings ADD COLUMN dirty INTEGER NOT NULL DEFAULT 1;

  UPDATE budgets SET id = 'budget:' || ifnull(category_id, 'all');

  CREATE TABLE sync (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,

  // Recurring transactions. `applied` counts the occurrences this device has
  // recorded; it stays on the device and never syncs.
  `
  CREATE TABLE recurring (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    category_id TEXT NOT NULL REFERENCES categories (id),
    note TEXT NOT NULL DEFAULT '',
    every TEXT NOT NULL CHECK (every IN ('day', 'week', 'month', 'year')),
    start INTEGER NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    dirty INTEGER NOT NULL DEFAULT 1,
    applied INTEGER NOT NULL DEFAULT 0
  );
  `,

  // Haptics become a level. A device that turned them off keeps them off;
  // one that had them on gets the default, outcomes only.
  `
  UPDATE settings
  SET value = CASE value WHEN 'false' THEN '"off"' ELSE '"essential"' END
  WHERE key = 'haptics';
  `,
];

/** Brings the schema to the latest version. SQLite's `user_version` holds the current one. */
export async function migrate(db: Database): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;

  for (let version = current; version < migrations.length; version += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each migration builds on the schema the last one left.
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[version] ?? '');
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
