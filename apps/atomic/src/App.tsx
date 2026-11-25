import type { Store } from '@rising/core';
import { fontAssets, ThemeProvider, ToastProvider } from '@rising/ui';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccountProvider } from './account/AccountProvider';
import { DataProvider } from './data/DataProvider';
import { openAppStore } from './data/openAppStore';
import { Root } from './Root';

void SplashScreen.preventAutoHideAsync();

/** Holds the splash screen until the fonts and the database are ready. */
export function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [store, setStore] = useState<Store>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    openAppStore().then(setStore, setError);
  }, []);

  const ready = fontsLoaded && (store !== undefined || error !== undefined);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Rethrown during render so the failure surfaces as a crash, not a blank screen.
  if (error !== undefined) throw error;
  if (!fontsLoaded || !store) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <StatusBar style="auto" />
          <DataProvider store={store}>
            <AccountProvider store={store}>
              <Root />
            </AccountProvider>
          </DataProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
