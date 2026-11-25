import type { Budget, Category, Settings, Transaction } from './model';

/** When a record last changed on any device, and whether it was deleted. */
export type Stamp = { updatedAt: number; deleted: boolean };

/** A setting as sync carries it. `value` is the setting's JSON. */
export type SettingChange = { key: string; value: string; updatedAt: number };

/**
 * Records that changed, in the shape a device sends and receives. The newer
 * `updatedAt` wins a conflict; a deletion travels as a record with `deleted`.
 */
export type Changes = {
  categories: (Category & Stamp)[];
  transactions: (Transaction & Stamp)[];
  budgets: (Budget & Stamp)[];
  settings: SettingChange[];
};

/** What one sync exchanged, handed back to the store to record. */
export type SyncResult = {
  /** The changes this device sent, as `pendingChanges` returned them. */
  pushed: Changes;

  /** The changes the server holds past this device's cursor. */
  pulled: Changes;

  /** The server's position after this sync. The next sync sends it. */
  cursor: string;
};

/** The settings every device of an account shares. The rest stay per device. */
export const syncedSettings = [
  'currency',
  'weekStart',
] as const satisfies readonly (keyof Settings)[];

export function noChanges(): Changes {
  return { categories: [], transactions: [], budgets: [], settings: [] };
}

export function countChanges(changes: Changes): number {
  return (
    changes.categories.length +
    changes.transactions.length +
    changes.budgets.length +
    changes.settings.length
  );
}

/**
 * The id of the budget for a category, or of the overall budget. A category
 * has one budget, so two devices that set it write the same record.
 */
export function budgetId(categoryId: string | null): string {
  return `budget:${categoryId ?? 'all'}`;
}
