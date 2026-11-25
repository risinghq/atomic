import { openStore, type Store } from '@atomic/core';
import { memoryDatabase } from '@atomic/core/testing';
import { ThemeProvider, ToastProvider } from '@atomic/ui';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DataProvider } from '../src/data/DataProvider';

/** A seeded in-memory store, as a fresh install has it after setup. */
export async function freshStore({ onboarded = true } = {}): Promise<Store> {
  let next = 0;
  const store = await openStore(memoryDatabase(), { newId: () => `id-${++next}` });

  await store.seedCategories();
  await store.updateSettings({ onboarded, currency: 'PEN', weekStart: 1 });

  return store;
}

/** Renders `ui` with the app's providers over `store`. */
export function renderWith(store: Store, ui: ReactNode) {
  return render(
    <ThemeProvider scheme="light">
      <ToastProvider>
        <DataProvider store={store}>{ui}</DataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
