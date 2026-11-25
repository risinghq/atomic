import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANA, codeIn, enterCode, fakeMail, requestCode, send, signIn } from './helpers';

const MINUTE = 60 * 1000;

/** Moves the Worker's clock forward. */
function later(ms: number) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + ms);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('signing in with an emailed code', () => {
  it('emails a code and signs in with it', async () => {
    const inbox = fakeMail();

    expect((await requestCode(ANA.email)).status).toBe(204);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ from: 'Atomic <acceso@atomic.rising.sh>', to: [ANA.email] });

    const code = codeIn(inbox, ANA.email);

    expect(inbox[0]!.subject).toContain(code);

    const res = await enterCode(ANA.email, code);
    const { token, email } = (await res.json()) as { token: string; email: string };

    expect(email).toBe(ANA.email);
    expect(await (await send('/me', { bearer: token })).json()).toEqual({ email: ANA.email });
  });

  it('uses a code once', async () => {
    const inbox = fakeMail();

    await requestCode(ANA.email);

    const code = codeIn(inbox, ANA.email);

    expect((await enterCode(ANA.email, code)).status).toBe(200);
    expect(await (await enterCode(ANA.email, code)).json()).toEqual({ error: 'expired' });
  });

  it('reaches the account a provider made for the same address', async () => {
    const google = await signIn('google', ANA);
    const inbox = fakeMail();

    await requestCode('  Ana@Example.com ');

    const res = await enterCode('ana@example.com', codeIn(inbox, ANA.email));
    const { token } = (await res.json()) as { token: string };

    const users = await env.DB.prepare('SELECT email FROM users').all();

    expect(users.results).toEqual([{ email: ANA.email }]);
    expect((await send('/me', { bearer: google })).status).toBe(200);
    expect((await send('/me', { bearer: token })).status).toBe(200);
  });

  it('refuses a wrong code, and the right one after five wrong guesses', async () => {
    const inbox = fakeMail();

    await requestCode(ANA.email);

    const code = codeIn(inbox, ANA.email);
    const wrong = code === '000000' ? '000001' : '000000';

    for (let guess = 0; guess < 5; guess++) {
      // oxlint-disable-next-line no-await-in-loop
      expect(await (await enterCode(ANA.email, wrong)).json()).toEqual({ error: 'invalid code' });
    }

    expect(await (await enterCode(ANA.email, code)).json()).toEqual({ error: 'expired' });
  });

  it('refuses a code entered after ten minutes', async () => {
    const inbox = fakeMail();

    await requestCode(ANA.email);
    later(11 * MINUTE);

    const res = await enterCode(ANA.email, codeIn(inbox, ANA.email));

    expect(await res.json()).toEqual({ error: 'expired' });
  });

  it('sends a new code after a minute, and only the new one works', async () => {
    const inbox = fakeMail();

    await requestCode(ANA.email);

    expect(await (await requestCode(ANA.email)).json()).toEqual({ error: 'too soon' });

    const first = codeIn(inbox, ANA.email);

    later(MINUTE);
    expect((await requestCode(ANA.email)).status).toBe(204);

    const second = codeIn(inbox, ANA.email);

    if (first !== second) expect((await enterCode(ANA.email, first)).status).toBe(400);
    expect((await enterCode(ANA.email, second)).status).toBe(200);
  });

  it('sends at most five codes an hour to an address', async () => {
    const inbox = fakeMail();

    for (let sent = 0; sent < 5; sent++) {
      // oxlint-disable-next-line no-await-in-loop
      expect((await requestCode(ANA.email)).status).toBe(204);
      later(MINUTE);
    }

    expect(await (await requestCode(ANA.email)).json()).toEqual({ error: 'too many codes' });
    expect(inbox).toHaveLength(5);

    later(60 * MINUTE);
    expect((await requestCode(ANA.email)).status).toBe(204);
  });

  it('refuses something that is not an address', async () => {
    const inbox = fakeMail();

    expect((await requestCode('ana')).status).toBe(400);
    expect((await requestCode('ana@example')).status).toBe(400);
    expect(inbox).toHaveLength(0);
  });

  it('reports a send Resend refused and stores no code', async () => {
    fakeMail({ status: 500 });

    expect(await (await requestCode(ANA.email)).json()).toEqual({ error: 'mail failed' });
    expect(await (await enterCode(ANA.email, '123456')).json()).toEqual({ error: 'expired' });
  });

  it('answers unavailable while the Worker has no Resend key', async () => {
    const key = env.RESEND_API_KEY;

    env.RESEND_API_KEY = '';

    try {
      const res = await requestCode(ANA.email);

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'unavailable' });
    } finally {
      env.RESEND_API_KEY = key;
    }
  });
});
