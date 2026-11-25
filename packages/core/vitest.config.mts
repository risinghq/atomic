import { defineConfig } from 'vitest/config';

// A zone with daylight saving, so the period tests cross a change (2026-03-08)
// on every machine. The test workers inherit it.
process.env.TZ = 'America/New_York';

export default defineConfig({
  test: { environment: 'node' },
});
