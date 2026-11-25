import AsyncStorage from '@react-native-async-storage/async-storage';
import { importLegacy, openStore, type Store } from '@atomic/core';
import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync } from 'expo-sqlite';

/**
 * Opens the app's database, brings over what the AsyncStorage version of the
 * app stored, and gives a new install its default categories.
 */
export async function openAppStore(): Promise<Store> {
  const store = await openStore(await openDatabaseAsync('atomic.db'), { newId: randomUUID });

  await importLegacy(store, AsyncStorage);
  await store.seedCategories();

  return store;
}
