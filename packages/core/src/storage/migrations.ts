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
