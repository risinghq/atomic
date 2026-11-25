import { defaultCategories } from '../categories';
import {
  defaultSettings,
  type Budget,
  type BudgetPeriod,
  type Category,
  type Kind,
  type Settings,
  type Transaction,
} from '../model';
import type { Span } from '../period';
import type { Database, SqlValue } from './database';
import { migrate } from './migrations';

type CategoryRow = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  kind: Kind;
  position: number;
  archived: number;
};

type TransactionRow = {
  id: string;
  kind: Kind;
  amount: number;
  category_id: string;
  note: string;
  at: number;
};

type BudgetRow = { id: string; category_id: string | null; amount: number; period: BudgetPeriod };

export type NewCategory = Pick<Category, 'name' | 'emoji' | 'color' | 'kind'>;
export type NewTransaction = Omit<Transaction, 'id'>;
export type NewBudget = Omit<Budget, 'id'>;

/** Records written in one go by an import. */
export type ImportRecords = {
  transactions: Transaction[];
  budgets: Budget[];
  settings: Partial<Settings>;
};

export type StoreOptions = {
  /** Makes the id of a new record; the app passes `expo-crypto`'s `randomUUID`. */
  newId: () => string;
};

export type Store = Awaited<ReturnType<typeof openStore>>;

/** Prepares the database and returns the reads and writes the app uses. */
export async function openStore(db: Database, { newId }: StoreOptions) {
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
      `SELECT * FROM categories ${archived ? '' : 'WHERE archived = 0'} ORDER BY position, id`,
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

    await insertCategories([category]);

    return category;
  }

  async function updateCategory(category: Category): Promise<void> {
    await db.runAsync(
      `UPDATE categories SET name = ?, emoji = ?, color = ?, kind = ?, position = ?, archived = ?
       WHERE id = ?`,
      [
        category.name,
        category.emoji,
        category.color,
        category.kind,
        category.position,
        category.archived ? 1 : 0,
        category.id,
      ]
    );
  }

  async function insertCategories(list: readonly Category[]): Promise<void> {
    await insertRows(
      'INSERT',
      'categories',
      ['id', 'name', 'emoji', 'color', 'kind', 'position', 'archived'],
      list.map((category) => [
        category.id,
        category.name,
        category.emoji,
        category.color,
        category.kind,
        category.position,
        category.archived ? 1 : 0,
      ])
    );
  }

  /** Adds the default categories when there are none. */
  async function seedCategories(): Promise<void> {
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT count(*) AS count FROM categories',
      []
    );
    if ((row?.count ?? 0) > 0) return;

    await insertCategories(defaultCategories);
  }

  /** Transactions inside the span, or all of them, newest first. */
  async function transactions(span?: Span): Promise<Transaction[]> {
    const params: SqlValue[] = span ? [span.start.getTime(), span.end.getTime()] : [];
    const rows = await db.getAllAsync<TransactionRow>(
      `SELECT * FROM transactions ${span ? 'WHERE at >= ? AND at < ?' : ''} ORDER BY at DESC, id`,
      params
    );

    return rows.map(toTransaction);
  }

  async function addTransaction(input: NewTransaction): Promise<Transaction> {
    const transaction: Transaction = { ...input, id: newId() };

    await insertTransactions([transaction]);

    return transaction;
  }

  async function insertTransactions(list: readonly Transaction[], verb = 'INSERT'): Promise<void> {
    await insertRows(
      verb,
      'transactions',
      ['id', 'kind', 'amount', 'category_id', 'note', 'at'],
      list.map((transaction) => [
        transaction.id,
        transaction.kind,
        transaction.amount,
        transaction.categoryId,
        transaction.note,
        transaction.at,
      ])
    );
  }

  async function updateTransaction(transaction: Transaction): Promise<void> {
    await db.runAsync(
      'UPDATE transactions SET kind = ?, amount = ?, category_id = ?, note = ?, at = ? WHERE id = ?',
      [
        transaction.kind,
        transaction.amount,
        transaction.categoryId,
        transaction.note,
        transaction.at,
        transaction.id,
      ]
    );
  }

  async function deleteTransaction(id: string): Promise<void> {
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  async function budgets(): Promise<Budget[]> {
    const rows = await db.getAllAsync<BudgetRow>(
      'SELECT * FROM budgets ORDER BY category_id IS NOT NULL, id',
      []
    );

    return rows.map(toBudget);
  }

  /** Sets the budget of a category, or the overall one, replacing any it had. */
  async function setBudget(input: NewBudget): Promise<Budget> {
    const budget: Budget = { ...input, id: newId() };

    await db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM budgets WHERE ifnull(category_id, '') = ?", [
        budget.categoryId ?? '',
      ]);
      await insertBudgets([budget]);
    });

    return budget;
  }

  async function insertBudgets(list: readonly Budget[], verb = 'INSERT'): Promise<void> {
    await insertRows(
      verb,
      'budgets',
      ['id', 'category_id', 'amount', 'period'],
      list.map((budget) => [budget.id, budget.categoryId, budget.amount, budget.period])
    );
  }

  async function deleteBudget(id: string): Promise<void> {
    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
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
    const rows = Object.entries(patch)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, JSON.stringify(value)]);

    if (rows.length > 0) {
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES ${rows.map(() => '(?, ?)').join(', ')}
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
        rows.flat()
      );
    }

    return settings();
  }

  /**
   * Writes imported records with the default categories in one transaction.
   * A record whose id or category budget already exists is skipped, so an
   * import that ran before can run again.
   */
  async function importRecords(records: ImportRecords): Promise<void> {
    await db.withTransactionAsync(async () => {
      await seedCategories();

      await insertTransactions(records.transactions, 'INSERT OR IGNORE');
      await insertBudgets(records.budgets, 'INSERT OR IGNORE');

      await updateSettings(records.settings);
    });
  }

  /** Deletes every record and setting, leaving an empty database. */
  async function eraseAll(): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        'DELETE FROM budgets; DELETE FROM transactions; DELETE FROM categories; DELETE FROM settings;'
      );
    });
  }

  /**
   * Inserts rows with as few statements as the bound-value limit allows. The
   * statements go out together; one connection runs them in order.
   */
  async function insertRows(
    verb: string,
    table: string,
    columns: readonly string[],
    rows: readonly SqlValue[][]
  ): Promise<void> {
    const row = `(${columns.map(() => '?').join(', ')})`;
    const statements = chunk(rows, ROWS_PER_INSERT).map((part) =>
      db.runAsync(
        `${verb} INTO ${table} (${columns.join(', ')}) VALUES ${part.map(() => row).join(', ')}`,
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
    settings,
    updateSettings,
    importRecords,
    eraseAll,
  };
}

// SQLite binds at most 32766 values in one statement. Rows here have at most
// seven columns, so 500 rows stay well under it.
const ROWS_PER_INSERT = 500;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const parts: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    parts.push(items.slice(start, start + size));
  }

  return parts;
}

function toCategory(row: CategoryRow): Category {
  return { ...row, archived: row.archived === 1 };
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

function pick(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}
