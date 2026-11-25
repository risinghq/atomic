/// <reference types="node" />
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Database, SqlValue } from '../src/storage/database';

function bind(params: SqlValue[]): SQLInputValue[] {
  return params;
}

/**
 * An in-memory `node:sqlite` database behind the methods expo-sqlite offers.
 * Tests in Node pass it to `openStore`. It needs Node, so no app bundle may
 * import it.
 */
export function memoryDatabase(): Database {
  const db = new DatabaseSync(':memory:');

  return {
    async execAsync(source) {
      db.exec(source);
    },

    async runAsync(source, params) {
      return db.prepare(source).run(...bind(params));
    },

    async getFirstAsync<T>(source: string, params: SqlValue[]) {
      return (db.prepare(source).get(...bind(params)) as T | undefined) ?? null;
    },

    async getAllAsync<T>(source: string, params: SqlValue[]) {
      return db.prepare(source).all(...bind(params)) as T[];
    },

    async withTransactionAsync(task) {
      db.exec('BEGIN');

      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
