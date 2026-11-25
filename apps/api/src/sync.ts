import { noChanges, syncedSettings, type Changes } from '@atomic/core';
import type { AppContext } from './app';

export const kinds = ['categories', 'transactions', 'budgets', 'settings'] as const;

type Kind = (typeof kinds)[number];

/** A record ready to store: its key, its stamp and the record as JSON. */
type Envelope = { id: string; updatedAt: number; data: string };

/** The most records one sync hands back. The app syncs again while `more` is set. */
export const PULL_LIMIT = 2000;

const MAX_ID = 128;
const MAX_RECORD = 64 * 1024;

/** D1 caps a bound value near 2 MB, so each insert carries at most about half of that. */
const CHUNK_BYTES = 1_000_000;

export class Invalid extends Error {}

/** Checks a pushed `Changes` and turns each record into an envelope. */
export function envelopesOf(changes: unknown): Map<Kind, Envelope[]> {
  if (typeof changes !== 'object' || changes === null) throw new Invalid('changes is required');

  const byKind = new Map<Kind, Envelope[]>();

  for (const kind of kinds) {
    const records = (changes as Record<string, unknown>)[kind] ?? [];

    if (!Array.isArray(records)) throw new Invalid(`${kind} must be a list`);

    byKind.set(
      kind,
      records.map((record) => envelopeOf(kind, record))
    );
  }

  return byKind;
}

function envelopeOf(kind: Kind, record: unknown): Envelope {
  if (typeof record !== 'object' || record === null)
    throw new Invalid(`a ${kind} record is not an object`);

  const fields = record as Record<string, unknown>;
  const id = kind === 'settings' ? fields.key : fields.id;
  const { updatedAt } = fields;

  if (typeof id !== 'string' || id === '' || id.length > MAX_ID)
    throw new Invalid(`a ${kind} record has no valid id`);
  if (!Number.isSafeInteger(updatedAt)) throw new Invalid(`${kind} ${id} has no valid updatedAt`);

  if (kind === 'settings') {
    if (!(syncedSettings as readonly string[]).includes(id))
      throw new Invalid(`setting ${id} does not sync`);
    if (typeof fields.value !== 'string') throw new Invalid(`setting ${id} has no value`);
  }

  const data = JSON.stringify(record);

  if (data.length > MAX_RECORD) throw new Invalid(`${kind} ${id} is too large`);

  return { id, updatedAt: updatedAt as number, data };
}

/** Splits envelopes so each bound JSON list stays under the size D1 accepts. */
function chunksOf(envelopes: Envelope[]): Envelope[][] {
  const chunks: Envelope[][] = [];
  let chunk: Envelope[] = [];
  let bytes = 0;

  for (const envelope of envelopes) {
    const size = envelope.data.length + MAX_ID + 64;

    if (chunk.length > 0 && bytes + size > CHUNK_BYTES) {
      chunks.push(chunk);
      chunk = [];
      bytes = 0;
    }

    chunk.push(envelope);
    bytes += size;
  }

  if (chunk.length > 0) chunks.push(chunk);

  return chunks;
}

export function parseCursor(cursor: unknown): number {
  if (cursor === null || cursor === undefined) return 0;
  if (typeof cursor === 'string' && /^\d{1,15}$/.test(cursor)) return Number(cursor);

  throw new Invalid('cursor must be a string of digits');
}

/**
 * Each record write takes the next number of the account's `seq`. A device
 * sends the last number it has seen as its cursor and receives every record
 * written after it.
 *
 * One D1 batch runs as one transaction: it reserves `n` numbers, writes each
 * pushed record that is newer than the stored one under its reserved number,
 * and reads what was written after the cursor and before this push. The push
 * itself is left out, because the device already holds it.
 */
export async function sync(
  c: AppContext,
  cursor: number,
  pushed: Map<Kind, Envelope[]>
): Promise<{ changes: Changes; cursor: string; more: boolean }> {
  const db = c.env.DB;
  const { userId } = c.get('account');
  const total = [...pushed.values()].reduce((sum, list) => sum + list.length, 0);
  const writes: D1PreparedStatement[] = [];
  let start = 0;

  for (const [kind, envelopes] of pushed) {
    for (const chunk of chunksOf(envelopes)) {
      writes.push(
        db
          .prepare(
            `INSERT INTO records (user_id, kind, id, updated_at, seq, data)
             SELECT ?1, ?2, j.value ->> '$.id', j.value ->> '$.updatedAt',
               (SELECT seq FROM users WHERE id = ?1) - ?3 + ?4 + j.key + 1, j.value ->> '$.data'
             FROM json_each(?5) AS j WHERE true
             ON CONFLICT (user_id, kind, id) DO UPDATE SET
               updated_at = excluded.updated_at, seq = excluded.seq, data = excluded.data
             WHERE excluded.updated_at > records.updated_at`
          )
          .bind(userId, kind, total, start, JSON.stringify(chunk))
      );
      start += chunk.length;
    }
  }

  // A cursor past the account's last number came from a deleted account; that device starts over.
  const results = await db.batch([
    db.prepare('UPDATE users SET seq = seq + ? WHERE id = ?').bind(total, userId),
    ...writes,
    db.prepare('SELECT seq FROM users WHERE id = ?').bind(userId),
    db
      .prepare(
        `SELECT kind, seq, data FROM records
         WHERE user_id = ?1
           AND seq > (CASE WHEN ?2 > (SELECT seq FROM users WHERE id = ?1) - ?3 THEN 0 ELSE ?2 END)
           AND seq <= (SELECT seq FROM users WHERE id = ?1) - ?3
         ORDER BY seq LIMIT ?4`
      )
      .bind(userId, cursor, total, PULL_LIMIT + 1),
  ]);

  const [counter] = (results.at(-2)?.results ?? []) as { seq: number }[];
  const last = counter?.seq ?? 0;
  const rows = (results.at(-1)?.results ?? []) as { kind: Kind; seq: number; data: string }[];
  const more = rows.length > PULL_LIMIT;
  const page = more ? rows.slice(0, PULL_LIMIT) : rows;
  const changes = noChanges();

  for (const row of page) {
    (changes[row.kind] as unknown[]).push(JSON.parse(row.data));
  }

  return { changes, cursor: String(more ? page.at(-1)!.seq : last), more };
}
