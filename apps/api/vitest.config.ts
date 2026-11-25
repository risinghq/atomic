import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => ({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          GOOGLE_CLIENT_ID: 'atomic-test.apps.googleusercontent.com',
          GOOGLE_CLIENT_SECRET: 'google-test-secret',
          GITHUB_CLIENT_ID: 'github-test-client',
          GITHUB_CLIENT_SECRET: 'github-test-secret',
          RESEND_API_KEY: 're_test',
          MIGRATIONS: await readD1Migrations('./migrations'),
        },
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
}));
