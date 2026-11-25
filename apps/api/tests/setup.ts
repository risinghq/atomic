import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, beforeAll, beforeEach, vi } from 'vitest';

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM logins'),
    env.DB.prepare('DELETE FROM users'),
    env.DB.prepare('DELETE FROM email_codes'),
  ]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});
