export type SqlValue = string | number | null;

/**
 * The part of expo-sqlite's `SQLiteDatabase` the store uses. The app passes
 * the real database; tests pass `node:sqlite` behind the same methods.
 */
export interface Database {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
