import { env, exports } from 'cloudflare:workers';
import { vi } from 'vitest';
import { randomToken, sha256 } from '../src/crypto';

type Init = { method?: string; json?: unknown; bearer?: string };

/** Sends a request through the Worker, as the app or the browser would. */
export function send(path: string, init: Init = {}): Promise<Response> {
  const headers = new Headers();

  if (init.bearer) headers.set('Authorization', `Bearer ${init.bearer}`);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');

  return exports.default.fetch(
    new Request(`https://atomic.rising.sh${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.json === undefined ? undefined : JSON.stringify(init.json),
      redirect: 'manual',
    })
  );
}

/** Who the person is at the provider. */
export type Person = {
  email: string;
  /** Whether the provider has verified the address. Defaults to true. */
  verified?: boolean;
  /** Further GitHub addresses, none of them primary. */
  others?: string[];
};

const b64url = (value: unknown) =>
  btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

/**
 * Stands in for Google's and GitHub's servers, the one boundary the tests
 * replace. Like them, it issues a code bound to the PKCE challenge of the
 * authorize URL and refuses a token request whose verifier does not match.
 */
export function fakeProviders(person: Person) {
  const challenges = new Map<string, string>();
  const verified = person.verified ?? true;

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const form = new URLSearchParams(String(init?.body ?? ''));
    const verifierMatches = async () =>
      challenges.get(form.get('code') ?? '') === (await sha256(form.get('code_verifier') ?? ''));

    if (url === 'https://oauth2.googleapis.com/token') {
      if (!(await verifierMatches()))
        return Response.json({ error: 'invalid_grant' }, { status: 400 });

      const claims = {
        aud: env.GOOGLE_CLIENT_ID,
        iss: 'https://accounts.google.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        email: person.email,
        email_verified: verified,
      };

      return Response.json({ id_token: `header.${b64url(claims)}.signature` });
    }

    if (url === 'https://github.com/login/oauth/access_token') {
      if (!(await verifierMatches())) return Response.json({ error: 'bad_verification_code' });

      return Response.json({ access_token: 'gho_test' });
    }

    if (url === 'https://api.github.com/user/emails') {
      return Response.json([
        ...(person.others ?? []).map((email) => ({ email, primary: false, verified: true })),
        { email: person.email, primary: true, verified },
      ]);
    }

    throw new Error(`unexpected fetch to ${url}`);
  });

  /** The provider's sign-in page: the person agrees, and the browser returns with a code. */
  return function approve(authorizeUrl: URL): string {
    const code = randomToken(8);

    challenges.set(code, authorizeUrl.searchParams.get('code_challenge') ?? '');

    return code;
  };
}

/** The app's half of a sign-in: its PKCE pair and the URL it opens. */
export async function startSignIn(provider: string) {
  const verifier = randomToken();
  const res = await send(`/auth/${provider}/start?challenge=${await sha256(verifier)}`);
  const authorize = new URL(res.headers.get('Location') ?? '');

  return { verifier, res, authorize, state: authorize.searchParams.get('state') ?? '' };
}

/** Follows the provider back to the Worker and returns where the Worker sends the app. */
export async function returnFromProvider(provider: string, query: Record<string, string>) {
  const res = await send(`/auth/${provider}/callback?${new URLSearchParams(query)}`);

  return new URL(res.headers.get('Location') ?? '');
}

/** Runs a whole sign-in and returns the session token. */
export async function signIn(provider: 'google' | 'github', person: Person): Promise<string> {
  const approve = fakeProviders(person);
  const { verifier, authorize, state } = await startSignIn(provider);
  const back = await returnFromProvider(provider, { code: approve(authorize), state });
  const res = await send('/auth/token', {
    method: 'POST',
    json: { code: back.searchParams.get('code'), verifier },
  });
  const { token } = (await res.json()) as { token: string };

  vi.unstubAllGlobals();

  return token;
}

/** A message Resend accepted. */
export type Mail = { from: string; to: string[]; subject: string; text: string };

/**
 * Stands in for Resend: it accepts a message sent with the Worker's key and
 * delivers it to the returned inbox, or answers `status` without delivering.
 */
export function fakeMail({ status = 200 }: { status?: number } = {}): Mail[] {
  const inbox: Mail[] = [];

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);

    if (url !== 'https://api.resend.com/emails') throw new Error(`unexpected fetch to ${url}`);

    const headers = new Headers(init?.headers);

    if (headers.get('Authorization') !== `Bearer ${env.RESEND_API_KEY}`) {
      return Response.json({ message: 'API key is invalid' }, { status: 401 });
    }

    if (status !== 200) return Response.json({ message: 'refused' }, { status });

    inbox.push(JSON.parse(String(init?.body)) as Mail);

    return Response.json({ id: crypto.randomUUID() });
  });

  return inbox;
}

/** The code in the latest message to `address`, read as a person would. */
export function codeIn(inbox: Mail[], address: string): string {
  const mail = inbox.findLast((message) => message.to.includes(address));

  return /\b(\d{6})\b/.exec(mail?.text ?? '')?.[1] ?? '';
}

export const requestCode = (email: string) =>
  send('/auth/email/start', { method: 'POST', json: { email } });

export const enterCode = (email: string, code: string) =>
  send('/auth/email/verify', { method: 'POST', json: { email, code } });

export const ANA = { email: 'ana@example.com' };
export const BETO = { email: 'beto@example.com' };
