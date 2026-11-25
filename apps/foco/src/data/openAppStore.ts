import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync } from 'expo-sqlite';
import { openStore, type Store } from './store';

export async function openAppStore(): Promise<Store> {
  return openStore(await openDatabaseAsync('foco.db'), { newId: randomUUID });
}
