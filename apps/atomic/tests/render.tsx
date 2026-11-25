import { openStore, type Store } from '@atomic/core';
import { memoryDatabase } from '@atomic/core/testing';
import { ThemeProvider, ToastProvider } from '@atomic/ui';
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountProvider } from '../src/account/AccountProvider';
import { DataProvider } from '../src/data/DataProvider';

// Jest has no native window to measure, so the provider starts from a phone's metrics.
const phone = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

/**
 * A seeded in-memory store. Onboarded, it holds the choices the person made;
 * otherwise it is a new install, which holds no settings of its own yet.
 */
export async function freshStore({ onboarded = true } = {}): Promise<Store> {
  let next = 0;
  const store = await openStore(memoryDatabase(), { newId: () => `id-${++next}` });

  await store.seedCategories();

  if (onboarded) await store.updateSettings({ onboarded, currency: 'PEN', weekStart: 1 });

  return store;
}

/** Renders `ui` with the app's providers over `store`. */
export function renderWith(store: Store, ui: ReactNode) {
  return render(
    <SafeAreaProvider initialMetrics={phone}>
      <ThemeProvider scheme="light">
        <ToastProvider>
          <DataProvider store={store}>
            <AccountProvider store={store}>{ui}</AccountProvider>
          </DataProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
