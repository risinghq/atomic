import type { SQLiteDatabase } from 'expo-sqlite';
import type { Database } from '../src/storage/database';

// Fails the typecheck when expo-sqlite's database stops fitting the interface
// the store is written against.
export type ExpoDatabaseFits = SQLiteDatabase extends Database ? true : never;
export const expoDatabaseFits: ExpoDatabaseFits = true;
