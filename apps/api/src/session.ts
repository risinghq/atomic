import { randomToken, sha256 } from './crypto';

export const TOKEN_PREFIX = 'atomic_';

/** Creates the account for a verified address, unless one exists. */
export const addUser = (db: D1Database, email: string) =>
  db
    .prepare(
      'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING'
    )
    .bind(crypto.randomUUID(), email, Date.now());

/** Signs a device in to the account and returns its token, which only the device keeps. */
export async function openSession(
  db: D1Database,
  userId: string
): Promise<{ token: string; email: string | undefined }> {
  const token = TOKEN_PREFIX + randomToken();
  const user = await db.batch<{ email: string }>([
    db
      .prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)')
      .bind(await sha256(token), userId, Date.now()),
    db.prepare('SELECT email FROM users WHERE id = ?').bind(userId),
  ]);

  return { token, email: user[1]?.results[0]?.email };
}
