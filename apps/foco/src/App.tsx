import { fontAssets, ThemeProvider } from '@rising/ui';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { prepareChimes } from './chimes';
import { FocoProvider } from './data/FocoProvider';
import { openAppStore } from './data/openAppStore';
import type { Store } from './data/store';
import { Shell } from './Shell';

void SplashScreen.preventAutoHideAsync();

/** Holds the splash screen until the fonts, the database and the chime channels are ready. */
export function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const [store, setStore] = useState<Store>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    Promise.all([openAppStore(), prepareChimes()]).then(([opened]) => setStore(opened), setError);
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
        <StatusBar style="auto" />
        <FocoProvider store={store}>
          <Shell />
        </FocoProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
