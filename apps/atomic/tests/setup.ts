import { vi } from 'vitest';

// jsdom has no media queries; Reanimated reads reduced motion through one.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// Expo native modules need the Expo runtime, which jsdom does not provide.
vi.mock('expo-haptics', () => ({
  selectionAsync: vi.fn(async () => {}),
  impactAsync: vi.fn(async () => {}),
  notificationAsync: vi.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

vi.mock('@expo-google-fonts/nunito', () => ({
  Nunito_400Regular: 'Nunito_400Regular.ttf',
  Nunito_500Medium: 'Nunito_500Medium.ttf',
  Nunito_600SemiBold: 'Nunito_600SemiBold.ttf',
  Nunito_700Bold: 'Nunito_700Bold.ttf',
}));

vi.mock('react-native-safe-area-context', async () => {
  const { createElement, Fragment } = await import('react');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    SafeAreaProvider: ({ children }: { children: import('react').ReactNode }) =>
      createElement(Fragment, null, children),
    useSafeAreaInsets: () => insets,
  };
});
