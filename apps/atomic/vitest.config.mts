import { defineConfig } from 'vitest/config';

// Screens render through react-native-web against an in-memory SQLite store,
// so tests drive the real data layer and see real DOM output.
export default defineConfig({
  define: { __DEV__: 'true' },
  resolve: {
    alias: { 'react-native': 'react-native-web' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // These publish extensionless ESM imports that only a bundler resolves.
    server: { deps: { inline: ['react-native-reanimated', 'react-native-worklets'] } },
  },
});
