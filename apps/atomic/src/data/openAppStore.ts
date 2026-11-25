import AsyncStorage from '@react-native-async-storage/async-storage';
import { importLegacy, openStore, type Store } from '@rising/core';
import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync } from 'expo-sqlite';

let opening: Promise<Store> | undefined;

async function open(): Promise<Store> {
  const store = await openStore(await openDatabaseAsync('atomic.db'), { newId: randomUUID });

  await importLegacy(store, AsyncStorage);
  await store.seedCategories();

  return store;
}

/**
 * Opens the app's database, brings over what the AsyncStorage version of the
 * app stored, and gives a new install its default categories. The app and the
 * widget share one connection per process.
 */
export function openAppStore(): Promise<Store> {
  opening ??= open().catch((error: unknown) => {
    opening = undefined;
    throw error;
  });

  return opening;
}
