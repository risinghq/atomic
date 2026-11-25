import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import type { App } from './app';
import { auth, signedIn } from './auth';
import { envelopesOf, Invalid, parseCursor, sync } from './sync';

const app = new Hono<App>();

app.route('/auth', auth);

app.use('/me', signedIn);
app.use('/sync', signedIn);
app.use('/data', signedIn);
app.use('/session', signedIn);
app.use('/account', signedIn);

app.get('/me', (c) => c.json({ email: c.get('account').email }));

app.post(
  '/sync',
  bodyLimit({
    maxSize: 4 * 1024 * 1024,
    onError: (c) => c.json({ error: 'too many changes in one sync' }, 413),
  }),
  async (c) => {
    const body = await c.req.json<{ cursor?: unknown; changes?: unknown }>().catch(() => undefined);

    try {
      const cursor = parseCursor(body?.cursor);
      const pushed = envelopesOf(body?.changes);

      return c.json(await sync(c, cursor, pushed));
    } catch (error) {
      if (error instanceof Invalid) return c.json({ error: error.message }, 400);

      throw error;
    }
  }
);

/** Erases the synced records. The account and its sessions stay. */
app.delete('/data', async (c) => {
  await c.env.DB.prepare('DELETE FROM records WHERE user_id = ?')
    .bind(c.get('account').userId)
    .run();

  return c.body(null, 204);
});

/** Signs this device out. */
app.delete('/session', async (c) => {
  await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
    .bind(c.get('account').tokenHash)
    .run();

  return c.body(null, 204);
});

/** Deletes the account, its records and every session. */
app.delete('/account', async (c) => {
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(c.get('account').userId).run();

  return c.body(null, 204);
});

app.notFound((c) => c.json({ error: 'not found' }, 404));

app.onError((error, c) => {
  if (error instanceof HTTPException) return error.getResponse();

  console.error(error);

  return c.json({ error: 'server error' }, 500);
});

export default app;
