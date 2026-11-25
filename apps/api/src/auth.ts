import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { App } from './app';
import { randomToken, safeEqual, sha256 } from './crypto';
import { authorizeUrl, providers, verifiedEmail, type Provider } from './providers';

/** Where the callback hands control back to the app. */
export const APP_REDIRECT = 'atomic://auth';

/** How long a sign-in may take, from the start to the token exchange. */
const LOGIN_TTL = 10 * 60 * 1000;

const TOKEN_PREFIX = 'atomic_';

/** A PKCE S256 challenge: 32 bytes of SHA-256 in unpadded base64url. */
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

const isProvider = (value: string): value is Provider => providers.includes(value as Provider);

const backToApp = (params: Record<string, string>) =>
  `${APP_REDIRECT}?${new URLSearchParams(params)}`;

type Login = { provider: string; verifier: string; challenge: string; user_id: string | null };

export const auth = new Hono<App>();

/**
 * Starts a sign-in. The app sends the S256 challenge of a verifier it keeps,
 * so only the app that started a sign-in can finish it (RFC 8252).
 */
auth.get('/:provider/start', async (c) => {
  const provider = c.req.param('provider');
  const challenge = c.req.query('challenge') ?? '';

  if (!isProvider(provider)) return c.json({ error: 'unknown provider' }, 404);
  if (!CHALLENGE.test(challenge)) return c.json({ error: 'missing challenge' }, 400);

  const state = randomToken(16);
  const verifier = randomToken();
  const now = Date.now();

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM logins WHERE expires_at < ?').bind(now),
    c.env.DB.prepare(
      'INSERT INTO logins (state, provider, verifier, challenge, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(state, provider, verifier, challenge, now + LOGIN_TTL),
  ]);

  return c.redirect(await authorizeUrl(c.env, provider, origin(c.req.url), state, verifier));
});

/** The provider sends the browser here. It answers with a one-time code for the app. */
auth.get('/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  const state = c.req.query('state') ?? '';
  const code = c.req.query('code');

  if (!isProvider(provider)) return c.json({ error: 'unknown provider' }, 404);

  const login = await c.env.DB.prepare(
    `SELECT provider, verifier, challenge, user_id FROM logins
     WHERE state = ? AND expires_at >= ? AND code_hash IS NULL`
  )
    .bind(state, Date.now())
    .first<Login>();

  if (!login || login.provider !== provider) return c.redirect(backToApp({ error: 'expired' }));

  if (!code) {
    await c.env.DB.prepare('DELETE FROM logins WHERE state = ?').bind(state).run();

    return c.redirect(backToApp({ error: 'denied' }));
  }

  const email = await verifiedEmail(c.env, provider, origin(c.req.url), code, login.verifier);

  if (!email) {
    await c.env.DB.prepare('DELETE FROM logins WHERE state = ?').bind(state).run();

    return c.redirect(backToApp({ error: 'failed' }));
  }

  const handoff = randomToken();

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING'
    ).bind(crypto.randomUUID(), email, Date.now()),
    c.env.DB.prepare(
      'UPDATE logins SET code_hash = ?, user_id = (SELECT id FROM users WHERE email = ?) WHERE state = ?'
    ).bind(await sha256(handoff), email, state),
  ]);

  return c.redirect(backToApp({ code: handoff }));
});

/** Trades the callback's one-time code and the app's verifier for a session token. */
auth.post('/token', async (c) => {
  const body = await c.req.json<{ code?: unknown; verifier?: unknown }>().catch(() => ({}));
  const { code, verifier } = body as { code?: unknown; verifier?: unknown };

  if (typeof code !== 'string' || typeof verifier !== 'string') {
    return c.json({ error: 'code and verifier are required' }, 400);
  }

  const codeHash = await sha256(code);

  // Deleting first makes the code single-use, whether or not the verifier matches.
  const login = await c.env.DB.prepare(
    `DELETE FROM logins WHERE code_hash = ? AND expires_at >= ?
     RETURNING provider, verifier, challenge, user_id`
  )
    .bind(codeHash, Date.now())
    .first<Login>();

  if (!login?.user_id || !safeEqual(await sha256(verifier), login.challenge)) {
    return c.json({ error: 'invalid code' }, 400);
  }

  const token = TOKEN_PREFIX + randomToken();
  const user = await c.env.DB.batch<{ email: string }>([
    c.env.DB.prepare(
      'INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)'
    ).bind(await sha256(token), login.user_id, Date.now()),
    c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(login.user_id),
  ]);

  return c.json({ token, email: user[1]?.results[0]?.email });
});

/** Requires `Authorization: Bearer <token>` and puts its account on the context. */
export const signedIn = createMiddleware<App>(async (c, next) => {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token.startsWith(TOKEN_PREFIX)) return c.json({ error: 'sign in required' }, 401);

  const tokenHash = await sha256(token);
  const account = await c.env.DB.prepare(
    `SELECT users.id AS userId, users.email AS email FROM sessions
     JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ?`
  )
    .bind(tokenHash)
    .first<{ userId: string; email: string }>();

  if (!account) return c.json({ error: 'sign in required' }, 401);

  c.set('account', { ...account, tokenHash });
  await next();
});

/** The scheme and host the request came in on, so callbacks match in tests and in production. */
function origin(url: string): string {
  return new URL(url).origin;
}
