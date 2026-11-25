import { memoryDatabase } from '@rising/core/testing';
import { ThemeProvider } from '@rising/ui';
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FocoProvider } from '../src/data/FocoProvider';
import { openStore, type Store } from '../src/data/store';
import { recorderOf } from './native';

// jest-expo's stand-in answers with values a phone never gives. A phone where
// nobody has tapped a notification answers null, and every listener it adds
// comes back as a subscription.
const emitter = recorderOf<'getLastNotificationResponse' | 'addListener'>(
  'expo-notifications',
  'NotificationsEmitterModule'
);
emitter.getLastNotificationResponse.mockReturnValue(null);
emitter.addListener.mockImplementation(() => ({ remove: () => {} }));

// The person allowed notifications.
const allowed = { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };
const permissions = recorderOf<'getPermissionsAsync' | 'requestPermissionsAsync'>(
  'expo-notifications',
  'NotificationPermissionsModule'
);
permissions.getPermissionsAsync.mockResolvedValue(allowed);
permissions.requestPermissionsAsync.mockResolvedValue(allowed);

// Jest has no native window to measure, so the provider starts from a phone's metrics.
const phone = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

/** An empty in-memory store. `now` is its clock; it defaults to the real one. */
export function freshStore({ now = Date.now }: { now?: () => number } = {}): Promise<Store> {
  let next = 0;
  return openStore(memoryDatabase(), { newId: () => `id-${++next}`, now });
}

/** Renders `ui` with the app's providers over `store`. */
export function renderWith(store: Store, ui: ReactNode) {
  return render(
    <SafeAreaProvider initialMetrics={phone}>
      <ThemeProvider scheme="light">
        <FocoProvider store={store}>{ui}</FocoProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
