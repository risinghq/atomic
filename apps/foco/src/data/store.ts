import { migrate, type Database } from '@rising/core';
import type { Focus, Plan } from '../plan';

export type EventKind = 'start' | 'stop' | 'switch';

/** The person started or stopped the chimes, or moved to something else. */
export interface FocusEvent {
  id: string;
  at: number;
  kind: EventKind;
  label: string;
}

export interface Settings extends Plan {
  /** Whether each chime also speaks; Android only. */
  voice: boolean;
  active: boolean;
  focus: Focus | null;
}

export const defaultSettings: Settings = {
  interval: 5,
  jitter: false,
  schedule: null,
  voice: false,
  active: false,
  focus: null,
};

// Each entry moves the schema one version forward. Append; never edit an entry
// that has shipped, because installed databases have already run it.
export const migrations: readonly string[] = [
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE events (
    id TEXT PRIMARY KEY NOT NULL,
    at INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('start', 'stop', 'switch')),
    label TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX events_at ON events (at);
  `,
];

export interface StoreOptions {
  newId: () => string;
  now?: () => number;
}

export async function openStore(db: Database, { newId, now = Date.now }: StoreOptions) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL');
  await migrate(db, migrations);

  async function settings(): Promise<Settings> {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings',
      []
    );
    const stored = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value)]));

    return { ...defaultSettings, ...stored };
  }

  async function updateSettings(change: Partial<Settings>): Promise<Settings> {
    await db.withTransactionAsync(async () => {
      for (const [key, value] of Object.entries(change)) {
        // oxlint-disable-next-line no-await-in-loop -- the writes share one transaction.
        await db.runAsync(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
          [key, JSON.stringify(value ?? null)]
        );
      }
    });

    return settings();
  }

  async function record(kind: EventKind, label = ''): Promise<FocusEvent> {
    const event = { id: newId(), at: now(), kind, label };

    await db.runAsync('INSERT INTO events (id, at, kind, label) VALUES (?, ?, ?, ?)', [
      event.id,
      event.at,
      event.kind,
      event.label,
    ]);

    return event;
  }

  /** Events from `from` up to, not including, `to`, oldest first. */
  function events(from: number, to: number): Promise<FocusEvent[]> {
    return db.getAllAsync<FocusEvent>(
      'SELECT id, at, kind, label FROM events WHERE at >= ? AND at < ? ORDER BY at, id',
      [from, to]
    );
  }

  async function lastEventBefore(at: number): Promise<FocusEvent | null> {
    return db.getFirstAsync<FocusEvent>(
      'SELECT id, at, kind, label FROM events WHERE at < ? ORDER BY at DESC, id DESC LIMIT 1',
      [at]
    );
  }

  async function erase(): Promise<void> {
    await db.execAsync('DELETE FROM events; DELETE FROM settings');
  }

  return { settings, updateSettings, record, events, lastEventBefore, erase, now };
}

export type Store = Awaited<ReturnType<typeof openStore>>;
