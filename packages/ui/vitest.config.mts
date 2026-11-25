import { defineConfig } from 'vitest/config';

// Components render through react-native-web, so tests see real DOM output
// instead of hand-written React Native mocks.
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
