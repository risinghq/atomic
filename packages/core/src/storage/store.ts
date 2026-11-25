import { defaultCategories } from '../categories';
import {
  defaultSettings,
  type Budget,
  type BudgetPeriod,
  type Category,
  type Every,
  type Kind,
  type Recurring,
  type Settings,
  type Transaction,
} from '../model';
import type { Span } from '../period';
import { dueIndexes, occurrenceAt, occurrenceId } from '../recurring';
import {
  budgetId,
  syncedSettings,
  type Changes,
  type SettingChange,
  type Stamp,
  type SyncResult,
} from '../sync';
import type { Database, SqlValue } from './database';
import { migrate } from './migrations';

type StampRow = { updated_at: number; deleted: number };

type CategoryRow = StampRow & {
  id: string;
  name: string;
  emoji: string;
  color: string;
  kind: Kind;
  position: number;
  archived: number;
};

type TransactionRow = StampRow & {
  id: string;
  kind: Kind;
  amount: number;
  category_id: string;
  note: string;
  at: number;
};

type BudgetRow = StampRow & {
  id: string;
  category_id: string | null;
  amount: number;
  period: BudgetPeriod;
};

type RecurringRow = StampRow & {
  id: string;
  kind: Kind;
  amount: number;
  category_id: string;
  note: string;
  every: Every;
  start: number;
  applied: number;
};

type SettingRow = { key: string; value: string; updated_at: number };

export type NewCategory = Pick<Category, 'name' | 'emoji' | 'color' | 'kind'>;
export type NewTransaction = Omit<Transaction, 'id'>;
export type NewBudget = Omit<Budget, 'id'>;
export type NewRecurring = Omit<Recurring, 'id'>;

/** Records written in one go by an import. */
export type ImportRecords = {
  transactions: Transaction[];
  budgets: Budget[];
  settings: Partial<Settings>;
};

export type StoreOptions = {
  /** Makes the id of a new record; the app passes `expo-crypto`'s `randomUUID`. */
  newId: () => string;

  /** The time a write is stamped with, in epoch milliseconds. */
  now?: () => number;
};

export type Store = Awaited<ReturnType<typeof openStore>>;

/**
 * How each synced table maps a record to its columns. Every table also holds
 * `updated_at`, `deleted` and `dirty`, which the store writes itself.
 */
const categoryTable = {
  name: 'categories',
  columns: ['id', 'name', 'emoji', 'color', 'kind', 'position', 'archived'],
  values: (category: Category): SqlValue[] => [
    category.id,
    category.name,
    category.emoji,
    category.color,
    category.kind,
    category.position,
    category.archived ? 1 : 0,
  ],
};

const transactionTable = {
  name: 'transactions',
  columns: ['id', 'kind', 'amount', 'category_id', 'note', 'at'],
  values: (transaction: Transaction): SqlValue[] => [
    transaction.id,
    transaction.kind,
    transaction.amount,
    transaction.categoryId,
    transaction.note,
    transaction.at,
  ],
};

const budgetTable = {
  name: 'budgets',
  columns: ['id', 'category_id', 'amount', 'period'],
  values: (budget: Budget): SqlValue[] => [
    budget.id,
    budget.categoryId,
    budget.amount,
    budget.period,
  ],
};

const recurringTable = {
  name: 'recurring',
  columns: ['id', 'kind', 'amount', 'category_id', 'note', 'every', 'start'],
  values: (rule: Recurring): SqlValue[] => [
    rule.id,
    rule.kind,
    rule.amount,
    rule.categoryId,
    rule.note,
    rule.every,
    rule.start,
  ],
};

type Table<T> = { name: string; columns: readonly string[]; values: (record: T) => SqlValue[] };

const stampColumns = ['updated_at', 'deleted', 'dirty'];

/**
 * Prepares the database and returns the reads and writes the app uses.
 *
 * Reads skip deleted records. Every write stamps the record with `now` and
 * marks it dirty, so the next sync sends it. A deletion keeps the record as a
 * tombstone, so the deletion reaches the other devices.
 */
export async function openStore(db: Database, { newId, now = Date.now }: StoreOptions) {
  // A connection starts with foreign keys off, and the pragma does nothing
  // inside a transaction, so it is set here before any migration runs.
  await db.execAsync('PRAGMA foreign_keys = ON');

  // WAL syncs the disk at checkpoints instead of twice per commit, and NORMAL
  // keeps every commit across an app crash. A VFS without WAL, like the web
  // build's OPFS, keeps its rollback journal.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL');

  await migrate(db);

  async function categories({ archived = false } = {}): Promise<Category[]> {
    const rows = await db.getAllAsync<CategoryRow>(
      `SELECT * FROM categories WHERE deleted = 0 ${archived ? '' : 'AND archived = 0'}
       ORDER BY position, id`,
      []
    );

    return rows.map(toCategory);
  }

  async function addCategory(input: NewCategory): Promise<Category> {
    const row = await db.getFirstAsync<{ next: number }>(
      'SELECT ifnull(max(position) + 1, 0) AS next FROM categories',
      []
    );
    const category: Category = { ...input, id: newId(), position: row?.next ?? 0, archived: false };

    await insertRecords(categoryTable, [category], edited());

    return category;
  }

  async function updateCategory(category: Category): Promise<void> {
    await db.runAsync(
      `UPDATE categories SET name = ?, emoji = ?, color = ?, kind = ?, position = ?, archived = ?,
       updated_at = ?, dirty = 1
       WHERE id = ?`,
      [
        category.name,
        category.emoji,
        category.color,
        category.kind,
        category.position,
        category.archived ? 1 : 0,
        now(),
        category.id,
      ]
    );
  }

  /**
   * Adds the default categories when there are none. Every device seeds the
   * same ids, so the defaults are not sent until someone edits them.
   */
  async function seedCategories(): Promise<void> {
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) AS count FROM categories',
      []
    );
    if ((row?.count ?? 0) > 0) return;

    await insertRecords(categoryTable, defaultCategories, {
      updatedAt: 0,
      deleted: false,
      dirty: false,
    });
  }

  /** Transactions inside the span, or all of them, newest first. */
  async function transactions(span?: Span): Promise<Transaction[]> {
    const params: SqlValue[] = span ? [span.start.getTime(), span.end.getTime()] : [];
    const rows = await db.getAllAsync<TransactionRow>(
      `SELECT * FROM transactions WHERE deleted = 0 ${span ? 'AND at >= ? AND at < ?' : ''}
       ORDER BY at DESC, id`,
      params
    );

    return rows.map(toTransaction);
  }

  async function addTransaction(input: NewTransaction): Promise<Transaction> {
    const transaction: Transaction = { ...input, id: newId() };

    await insertRecords(transactionTable, [transaction], edited());

    return transaction;
  }

  async function updateTransaction(transaction: Transaction): Promise<void> {
    await db.runAsync(
      `UPDATE transactions SET kind = ?, amount = ?, category_id = ?, note = ?, at = ?,
       updated_at = ?, dirty = 1
       WHERE id = ?`,
      [
        transaction.kind,
        transaction.amount,
        transaction.categoryId,
        transaction.note,
        transaction.at,
        now(),
        transaction.id,
      ]
    );
  }

  async function deleteTransaction(id: string): Promise<void> {
    await bury('transactions', id);
  }

  async function budgets(): Promise<Budget[]> {
    const rows = await db.getAllAsync<BudgetRow>(
      'SELECT * FROM budgets WHERE deleted = 0 ORDER BY category_id IS NOT NULL, id',
      []
    );

    return rows.map(toBudget);
  }

  /** Sets the budget of a category, or the overall one, replacing any it had. */
  async function setBudget(input: NewBudget): Promise<Budget> {
    const budget: Budget = { ...input, id: budgetId(input.categoryId) };

    await insertRecords(budgetTable, [budget], edited(), upsert(budgetTable.columns));

    return budget;
  }

  async function deleteBudget(id: string): Promise<void> {
    await bury('budgets', id);
  }

  /** Recurring transactions, by their first occurrence. */
  async function recurring(): Promise<Recurring[]> {
    const rows = await db.getAllAsync<RecurringRow>(
      'SELECT * FROM recurring WHERE deleted = 0 ORDER BY start, id',
      []
    );

    return rows.map(toRecurring);
  }

  /** Saves a recurring transaction and records the occurrences already due. */
  async function addRecurring(input: NewRecurring): Promise<Recurring> {
    const rule: Recurring = { ...input, id: newId() };

    await insertRecords(recurringTable, [rule], edited());
    await applyRecurring();

    return rule;
  }

  /** Changes the amount, category or note of the occurrences still to come. */
  async function updateRecurring(rule: Recurring): Promise<void> {
    await db.runAsync(
      `UPDATE recurring SET kind = ?, amount = ?, category_id = ?, note = ?,
       updated_at = ?, dirty = 1
       WHERE id = ?`,
      [rule.kind, rule.amount, rule.categoryId, rule.note, now(), rule.id]
    );
  }

  /** Stops a recurring transaction. The occurrences it recorded stay. */
  async function deleteRecurring(id: string): Promise<void> {
    await bury('recurring', id);
  }

  /**
   * Records every occurrence due by now as a transaction, and returns how
   * many it recorded.
   *
   * An occurrence carries its rule's stamp, so an edit or a deletion of it
   * wins over the copy another device records, and that copy wins over
   * nothing. A deleted occurrence keeps its tombstone and is not recorded
   * again.
   */
  async function applyRecurring(): Promise<number> {
    const at = now();
    let recorded = 0;

    await db.withTransactionAsync(async () => {
      const rows = await db.getAllAsync<RecurringRow>(
        'SELECT * FROM recurring WHERE deleted = 0',
        []
      );

      for (const row of rows) {
        const rule = toRecurring(row);
        const due = dueIndexes(rule, row.applied, at);

        if (due.length === 0) continue;

        const occurrences = due.map((index): Transaction => ({
          id: occurrenceId(rule.id, index),
          kind: rule.kind,
          amount: rule.amount,
          categoryId: rule.categoryId,
          note: rule.note,
          at: occurrenceAt(rule.start, rule.every, index),
        }));

        // oxlint-disable-next-line no-await-in-loop -- one connection runs the writes in order anyway.
        await insertRecords(
          transactionTable,
          occurrences,
          { updatedAt: row.updated_at, deleted: false, dirty: true },
          '',
          'INSERT OR IGNORE'
        );
        // oxlint-disable-next-line no-await-in-loop
        await db.runAsync('UPDATE recurring SET applied = ? WHERE id = ?', [
          row.applied + due.length,
          rule.id,
        ]);

        recorded += due.length;
      }
    });

    return recorded;
  }

  async function settings(): Promise<Settings> {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings',
      []
    );
    const stored = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]));

    return { ...defaultSettings, ...pick(stored, Object.keys(defaultSettings)) };
  }

  async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const updatedAt = now();
    const rows = Object.entries(patch)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]): SqlValue[] => [key, JSON.stringify(value), updatedAt, 1]);

    await insertRows(
      'INSERT',
      'settings',
      ['key', 'value', 'updated_at', 'dirty'],
      rows,
      'ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, dirty = 1'
    );

    return settings();
  }

  /**
   * Writes imported records with the default categories in one transaction.
   * A record whose id or category budget already exists is skipped, so an
   * import that ran before can run again.
   */
  async function importRecords(records: ImportRecords): Promise<void> {
    const imported = records.budgets.map((budget) => ({
      ...budget,
      id: budgetId(budget.categoryId),
    }));

    await db.withTransactionAsync(async () => {
      await seedCategories();

      await insertRecords(transactionTable, records.transactions, edited(), '', 'INSERT OR IGNORE');
      await insertRecords(budgetTable, imported, edited(), '', 'INSERT OR IGNORE');

      await updateSettings(records.settings);
    });
  }

  /** Deletes every record and setting, and forgets the sync position. */
  async function eraseAll(): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        `DELETE FROM budgets; DELETE FROM transactions; DELETE FROM recurring;
         DELETE FROM categories; DELETE FROM settings; DELETE FROM sync;`
      );
    });
  }

  /**
   * Leaves the account this device synced with: forgets the server position
   * and marks every record unsent, so the next account it syncs with receives
   * all of it.
   */
  async function forgetSync(): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        `UPDATE categories SET dirty = 1; UPDATE transactions SET dirty = 1;
         UPDATE budgets SET dirty = 1; UPDATE recurring SET dirty = 1;
         UPDATE settings SET dirty = 1; DELETE FROM sync;`
      );
    });
  }

  /** The records this device changed since they were last sent. */
  async function pendingChanges(): Promise<Changes> {
    const [categoryRows, transactionRows, budgetRows, recurringRows, settingRows] =
      await Promise.all([
        db.getAllAsync<CategoryRow>('SELECT * FROM categories WHERE dirty = 1', []),
        db.getAllAsync<TransactionRow>('SELECT * FROM transactions WHERE dirty = 1', []),
        db.getAllAsync<BudgetRow>('SELECT * FROM budgets WHERE dirty = 1', []),
        db.getAllAsync<RecurringRow>('SELECT * FROM recurring WHERE dirty = 1', []),
        db.getAllAsync<SettingRow>(
          `SELECT key, value, updated_at FROM settings
         WHERE dirty = 1 AND key IN (${syncedSettings.map(() => '?').join(', ')})`,
          [...syncedSettings]
        ),
      ]);

    return {
      categories: categoryRows.map((row) => Object.assign(toCategory(row), toStamp(row))),
      transactions: transactionRows.map((row) => Object.assign(toTransaction(row), toStamp(row))),
      budgets: budgetRows.map((row) => Object.assign(toBudget(row), toStamp(row))),
      recurring: recurringRows.map((row) => Object.assign(toRecurring(row), toStamp(row))),
      settings: settingRows.map((row) => ({
        key: row.key,
        value: row.value,
        updatedAt: row.updated_at,
      })),
    };
  }

  /** The server position the last sync ended at, or null before the first one. */
  async function syncCursor(): Promise<string | null> {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM sync WHERE key = 'cursor'",
      []
    );

    return row?.value ?? null;
  }

  /**
   * Records a finished sync in one transaction. A sent record stays dirty when
   * it changed again while the sync ran. A received record replaces the local
   * one only when it is newer, so the later edit wins on every device.
   */
  async function completeSync({ pushed, pulled, cursor }: SyncResult): Promise<void> {
    await db.withTransactionAsync(async () => {
      await markSent(
        'categories',
        'id',
        pushed.categories.map((record) => [record.id, record.updatedAt])
      );
      await markSent(
        'transactions',
        'id',
        pushed.transactions.map((record) => [record.id, record.updatedAt])
      );
      await markSent(
        'budgets',
        'id',
        pushed.budgets.map((record) => [record.id, record.updatedAt])
      );
      await markSent(
        'recurring',
        'id',
        pushed.recurring.map((record) => [record.id, record.updatedAt])
      );
      await markSent(
        'settings',
        'key',
        pushed.settings.map((setting) => [setting.key, setting.updatedAt])
      );

      // Categories go first: the other records reference them.
      await mergeRecords(categoryTable, pulled.categories);
      await mergeRecords(transactionTable, pulled.transactions);
      await mergeRecords(budgetTable, pulled.budgets);
      await mergeRecords(recurringTable, pulled.recurring);
      await mergeSettings(pulled.settings);

      await db.runAsync(
        `INSERT INTO sync (key, value) VALUES ('cursor', ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
        [cursor]
      );
    });
  }

  type Mark = { updatedAt: number; deleted: boolean; dirty: boolean };

  function edited(): Mark {
    return { updatedAt: now(), deleted: false, dirty: true };
  }

  async function bury(table: string, id: string): Promise<void> {
    await db.runAsync(`UPDATE ${table} SET deleted = 1, updated_at = ?, dirty = 1 WHERE id = ?`, [
      now(),
      id,
    ]);
  }

  async function insertRecords<T>(
    table: Table<T>,
    records: readonly T[],
    mark: Mark,
    conflict = '',
    verb = 'INSERT'
  ): Promise<void> {
    const stamp = [mark.updatedAt, mark.deleted ? 1 : 0, mark.dirty ? 1 : 0];

    await insertRows(
      verb,
      table.name,
      [...table.columns, ...stampColumns],
      records.map((record) => [...table.values(record), ...stamp]),
      conflict
    );
  }

  async function mergeRecords<T>(table: Table<T>, records: readonly (T & Stamp)[]): Promise<void> {
    await insertRows(
      'INSERT',
      table.name,
      [...table.columns, ...stampColumns],
      records.map((record) => [
        ...table.values(record),
        record.updatedAt,
        record.deleted ? 1 : 0,
        0,
      ]),
      `${upsert(table.columns)} WHERE excluded.updated_at > ${table.name}.updated_at`
    );
  }

  async function mergeSettings(list: readonly SettingChange[]): Promise<void> {
    const synced: readonly string[] = syncedSettings;

    await insertRows(
      'INSERT',
      'settings',
      ['key', 'value', 'updated_at', 'dirty'],
      list
        .filter((setting) => synced.includes(setting.key))
        .map((setting) => [setting.key, setting.value, setting.updatedAt, 0]),
      `ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at,
       dirty = 0 WHERE excluded.updated_at > settings.updated_at`
    );
  }

  /** Clears `dirty` on each `[key, updatedAt]` pair that still holds that stamp. */
  async function markSent(table: string, key: string, sent: readonly SqlValue[][]): Promise<void> {
    const statements = chunk(sent, ROWS_PER_INSERT).map((part) =>
      db.runAsync(
        `UPDATE ${table} SET dirty = 0
         WHERE (${key}, updated_at) IN (VALUES ${part.map(() => '(?, ?)').join(', ')})`,
        part.flat()
      )
    );

    await Promise.all(statements);
  }

  /**
   * Inserts rows with as few statements as the bound-value limit allows. The
   * statements go out together; one connection runs them in order.
   */
  async function insertRows(
    verb: string,
    table: string,
    columns: readonly string[],
    rows: readonly SqlValue[][],
    conflict = ''
  ): Promise<void> {
    const row = `(${columns.map(() => '?').join(', ')})`;
    const statements = chunk(rows, ROWS_PER_INSERT).map((part) =>
      db.runAsync(
        `${verb} INTO ${table} (${columns.join(', ')}) VALUES ${part.map(() => row).join(', ')}
         ${conflict}`,
        part.flat()
      )
    );

    await Promise.all(statements);
  }

  return {
    categories,
    addCategory,
    updateCategory,
    seedCategories,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    budgets,
    setBudget,
    deleteBudget,
    recurring,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    applyRecurring,
    settings,
    updateSettings,
    importRecords,
    eraseAll,
    forgetSync,
    pendingChanges,
    syncCursor,
    completeSync,
  };
}

// SQLite binds at most 32766 values in one statement. Rows here have at most
// ten columns, so 500 rows stay well under it.
const ROWS_PER_INSERT = 500;

/** An upsert that overwrites every column with the incoming row. */
function upsert(columns: readonly string[]): string {
  const assignments = [...columns, ...stampColumns]
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`);

  return `ON CONFLICT (id) DO UPDATE SET ${assignments.join(', ')}`;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const parts: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    parts.push(items.slice(start, start + size));
  }

  return parts;
}

function toStamp(row: StampRow): Stamp {
  return { updatedAt: row.updated_at, deleted: row.deleted === 1 };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    kind: row.kind,
    position: row.position,
    archived: row.archived === 1,
  };
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    kind: row.kind,
    amount: row.amount,
    categoryId: row.category_id,
    note: row.note,
    at: row.at,
  };
}

function toBudget(row: BudgetRow): Budget {
  return { id: row.id, categoryId: row.category_id, amount: row.amount, period: row.period };
}

function toRecurring(row: RecurringRow): Recurring {
  return {
    id: row.id,
    kind: row.kind,
    amount: row.amount,
    categoryId: row.category_id,
    note: row.note,
    every: row.every,
    start: row.start,
  };
}

function pick(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}
