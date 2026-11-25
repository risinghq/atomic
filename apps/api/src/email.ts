import { Hono } from 'hono';
import type { App } from './app';
import { safeEqual, sha256 } from './crypto';
import { mailConfigured, MailFailed, sendSignInCode } from './mail';
import { addUser, openSession } from './session';

const CODE_TTL = 10 * 60 * 1000;
const ATTEMPTS = 5;
const RESEND_AFTER = 60 * 1000;
const SEND_WINDOW = 60 * 60 * 1000;
const SENDS_PER_WINDOW = 5;

const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Sent = { sent_at: number; window_start: number; sends: number };

/** The address as the account stores it, or undefined when it is not one. */
function addressOf(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const address = value.trim().toLowerCase();

  return address.length <= 254 && ADDRESS.test(address) ? address : undefined;
}

/** Six uniform decimal digits. */
function newCode(): string {
  const limit = 2 ** 32 - (2 ** 32 % 1_000_000);
  const [value] = crypto.getRandomValues(new Uint32Array(1));

  return value! < limit ? String(value! % 1_000_000).padStart(6, '0') : newCode();
}

/**
 * Sign-in by a code emailed to the address. Typing the code proves the person
 * reads that inbox, as a provider's verified address does.
 */
export const emailSignIn = new Hono<App>();

/** Emails a new code, which replaces the last one sent to the address. */
emailSignIn.post('/start', async (c) => {
  const body = await c.req.json<{ email?: unknown }>().catch(() => ({}));
  const email = addressOf((body as { email?: unknown }).email);

  if (!email) return c.json({ error: 'invalid email' }, 400);
  if (!mailConfigured(c.env)) return c.json({ error: 'unavailable' }, 503);

  const now = Date.now();
  const last = await c.env.DB.prepare(
    'SELECT sent_at, window_start, sends FROM email_codes WHERE email = ?'
  )
    .bind(email)
    .first<Sent>();
  const newWindow = !last || now - last.window_start >= SEND_WINDOW;
  const sends = newWindow ? 1 : last.sends + 1;

  if (last && now - last.sent_at < RESEND_AFTER) return c.json({ error: 'too soon' }, 429);
  if (sends > SENDS_PER_WINDOW) return c.json({ error: 'too many codes' }, 429);

  const code = newCode();

  try {
    await sendSignInCode(c.env, email, code);
  } catch (error) {
    if (!(error instanceof MailFailed)) throw error;

    console.error(error.message);

    return c.json({ error: 'mail failed' }, 502);
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM email_codes WHERE expires_at < ? AND window_start < ?').bind(
      now,
      now - SEND_WINDOW
    ),
    c.env.DB.prepare(
      `INSERT INTO email_codes (email, code_hash, attempts_left, sent_at, expires_at, window_start, sends)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash,
         attempts_left = excluded.attempts_left, sent_at = excluded.sent_at,
         expires_at = excluded.expires_at, window_start = excluded.window_start,
         sends = excluded.sends`
    ).bind(
      email,
      await sha256(code),
      ATTEMPTS,
      now,
      now + CODE_TTL,
      newWindow ? now : last.window_start,
      sends
    ),
  ]);

  return c.body(null, 204);
});

/** Trades the address and its emailed code for a session. A code works once. */
emailSignIn.post('/verify', async (c) => {
  const body = await c.req.json<{ email?: unknown; code?: unknown }>().catch(() => ({}));
  const { code } = body as { code?: unknown };
  const email = addressOf((body as { email?: unknown }).email);

  if (!email || typeof code !== 'string') {
    return c.json({ error: 'email and code are required' }, 400);
  }

  // Spending the attempt before comparing keeps concurrent guesses within ATTEMPTS.
  const live = await c.env.DB.prepare(
    `UPDATE email_codes SET attempts_left = attempts_left - 1
     WHERE email = ? AND attempts_left > 0 AND expires_at >= ? RETURNING code_hash`
  )
    .bind(email, Date.now())
    .first<{ code_hash: string }>();

  if (!live) return c.json({ error: 'expired' }, 400);
  if (!safeEqual(await sha256(code.trim()), live.code_hash)) {
    return c.json({ error: 'invalid code' }, 400);
  }

  const [spent, , user] = await c.env.DB.batch<{ id: string }>([
    c.env.DB.prepare(
      'DELETE FROM email_codes WHERE email = ? AND code_hash = ? RETURNING email'
    ).bind(email, live.code_hash),
    addUser(c.env.DB, email),
    c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email),
  ]);
  const userId = user?.results[0]?.id;

  if (!spent?.results.length || !userId) return c.json({ error: 'expired' }, 400);

  return c.json(await openSession(c.env.DB, userId));
});
