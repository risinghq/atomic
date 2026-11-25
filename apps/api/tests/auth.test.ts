import { env } from 'cloudflare:workers';
import { describe, expect, it, vi } from 'vitest';
import { ANA, fakeProviders, returnFromProvider, send, signIn, startSignIn } from './helpers';

const users = async () =>
  (await env.DB.prepare('SELECT email FROM users ORDER BY email').all<{ email: string }>()).results;

async function trade(code: string | null, verifier: string) {
  return send('/auth/token', { method: 'POST', json: { code, verifier } });
}

describe('signing in', () => {
  it('signs in with Google and shows the account email', async () => {
    const token = await signIn('google', ANA);

    expect(token).toMatch(/^atomic_/);

    const me = await send('/me', { bearer: token });

    expect(await me.json()).toEqual({ email: ANA.email });
  });

  it('signs in with GitHub using its primary verified address', async () => {
    const token = await signIn('github', {
      email: 'Ana@Example.com',
      others: ['ana@work.example'],
    });
    const me = await send('/me', { bearer: token });

    expect(await me.json()).toEqual({ email: ANA.email });
  });

  it('gives Google and GitHub with the same address one account', async () => {
    await signIn('google', ANA);
    await signIn('github', ANA);

    expect(await users()).toEqual([{ email: ANA.email }]);
  });

  it('sends the browser to the provider with a callback on this host', async () => {
    const google = await startSignIn('google');
    const github = await startSignIn('github');

    expect(google.authorize.origin).toBe('https://accounts.google.com');
    expect(google.authorize.searchParams.get('redirect_uri')).toBe(
      'https://atomic.rising.sh/auth/google/callback'
    );
    expect(github.authorize.origin).toBe('https://github.com');
    expect(github.authorize.searchParams.get('redirect_uri')).toBe(
      'https://atomic.rising.sh/auth/github/callback'
    );
  });

  it('needs a PKCE challenge from the app', async () => {
    expect((await send('/auth/google/start')).status).toBe(400);
    expect((await send('/auth/gitlab/start?challenge=x')).status).toBe(404);
  });

  it('refuses an address the provider has not verified', async () => {
    const approve = fakeProviders({ ...ANA, verified: false });
    const { authorize, state } = await startSignIn('google');
    const back = await returnFromProvider('google', { code: approve(authorize), state });

    expect(back.href).toBe('atomic://auth?error=failed');
    expect(await users()).toEqual([]);
  });

  it('tells the app when the person cancels at the provider', async () => {
    fakeProviders(ANA);
    const { state } = await startSignIn('github');
    const back = await returnFromProvider('github', { error: 'access_denied', state });

    expect(back.href).toBe('atomic://auth?error=denied');
  });

  it('refuses a callback whose state it never issued', async () => {
    const approve = fakeProviders(ANA);
    const { authorize } = await startSignIn('google');
    const back = await returnFromProvider('google', { code: approve(authorize), state: 'forged' });

    expect(back.href).toBe('atomic://auth?error=expired');
  });

  it('refuses a sign-in finished after ten minutes', async () => {
    const approve = fakeProviders(ANA);
    const { authorize, state } = await startSignIn('google');

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);

    const back = await returnFromProvider('google', { code: approve(authorize), state });

    vi.useRealTimers();

    expect(back.href).toBe('atomic://auth?error=expired');
  });

  it('gives a session only to the app holding the verifier, and only once', async () => {
    const approve = fakeProviders(ANA);
    const { verifier, authorize, state } = await startSignIn('google');
    const back = await returnFromProvider('google', { code: approve(authorize), state });
    const code = back.searchParams.get('code');

    expect((await trade(code, 'someone-else')).status).toBe(400);
    expect((await trade(code, verifier)).status).toBe(400);
  });

  it('accepts the code with the right verifier', async () => {
    const approve = fakeProviders(ANA);
    const { verifier, authorize, state } = await startSignIn('google');
    const back = await returnFromProvider('google', { code: approve(authorize), state });
    const res = await trade(back.searchParams.get('code'), verifier);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ email: ANA.email });
  });
});

describe('sessions', () => {
  it('rejects requests without a valid token', async () => {
    expect((await send('/me')).status).toBe(401);
    expect((await send('/me', { bearer: 'atomic_made-up' })).status).toBe(401);
  });

  it('signs out one device and keeps the other', async () => {
    const phone = await signIn('google', ANA);
    const tablet = await signIn('github', ANA);

    expect((await send('/session', { method: 'DELETE', bearer: phone })).status).toBe(204);
    expect((await send('/me', { bearer: phone })).status).toBe(401);
    expect((await send('/me', { bearer: tablet })).status).toBe(200);
  });
});
