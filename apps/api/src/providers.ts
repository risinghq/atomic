import { sha256 } from './crypto';

export type Provider = 'google' | 'github';

export const providers: readonly Provider[] = ['google', 'github'];

type Secrets = Pick<
  Env,
  'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET'
>;

const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_EMAILS = 'https://api.github.com/user/emails';

export const callbackUrl = (origin: string, provider: Provider) =>
  `${origin}/auth/${provider}/callback`;

/** Whether the provider's OAuth client is set; a deploy without its secrets has none. */
export const configured = (env: Secrets, provider: Provider) =>
  Boolean(provider === 'google' ? env.GOOGLE_CLIENT_ID : env.GITHUB_CLIENT_ID);

/** The provider's sign-in page. `verifier` is this Worker's PKCE verifier with the provider. */
export async function authorizeUrl(
  env: Secrets,
  provider: Provider,
  origin: string,
  state: string,
  verifier: string
): Promise<string> {
  const google = provider === 'google';
  const url = new URL(google ? GOOGLE_AUTHORIZE : GITHUB_AUTHORIZE);

  url.search = new URLSearchParams({
    client_id: google ? env.GOOGLE_CLIENT_ID : env.GITHUB_CLIENT_ID,
    redirect_uri: callbackUrl(origin, provider),
    state,
    code_challenge: await sha256(verifier),
    code_challenge_method: 'S256',
    ...(google
      ? { response_type: 'code', scope: 'openid email', prompt: 'select_account' }
      : { scope: 'user:email', allow_signup: 'true' }),
  }).toString();

  return url.toString();
}

/** Trades the provider's authorization code for the person's verified email, or undefined. */
export function verifiedEmail(
  env: Secrets,
  provider: Provider,
  origin: string,
  code: string,
  verifier: string
): Promise<string | undefined> {
  return provider === 'google'
    ? googleEmail(env, origin, code, verifier)
    : githubEmail(env, origin, code, verifier);
}

function claimsOf(idToken: string): Record<string, unknown> | undefined {
  try {
    const body = idToken.split('.')[1] ?? '';

    return JSON.parse(atob(body.replaceAll('-', '+').replaceAll('_', '/')));
  } catch {
    return undefined;
  }
}

/**
 * The ID token comes straight from Google's token endpoint over TLS, so its
 * signature is not checked; the audience, issuer, expiry and `email_verified`
 * still are.
 */
async function googleEmail(
  env: Secrets,
  origin: string,
  code: string,
  verifier: string
): Promise<string | undefined> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(origin, 'google'),
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) return undefined;

  const { id_token } = (await res.json()) as { id_token?: string };
  const claims = id_token ? claimsOf(id_token) : undefined;

  if (!claims) return undefined;

  const { aud, iss, exp, email, email_verified } = claims;
  const valid =
    aud === env.GOOGLE_CLIENT_ID &&
    typeof iss === 'string' &&
    GOOGLE_ISSUERS.has(iss) &&
    typeof exp === 'number' &&
    exp > Date.now() / 1000 &&
    (email_verified === true || email_verified === 'true') &&
    typeof email === 'string';

  return valid ? email.trim().toLowerCase() : undefined;
}

type GithubEmail = { email: string; primary: boolean; verified: boolean };

/** GitHub's primary address, when GitHub has verified it. */
async function githubEmail(
  env: Secrets,
  origin: string,
  code: string,
  verifier: string
): Promise<string | undefined> {
  const res = await fetch(GITHUB_TOKEN, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      redirect_uri: callbackUrl(origin, 'github'),
      code,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) return undefined;

  // GitHub reports a bad code with status 200 and an `error` field.
  const { access_token } = (await res.json()) as { access_token?: string };

  if (!access_token) return undefined;

  const emails = await fetch(GITHUB_EMAILS, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${access_token}`,
      'User-Agent': 'atomic',
    },
  });

  if (!emails.ok) return undefined;

  const list = (await emails.json()) as GithubEmail[];
  const primary = list.find((entry) => entry.primary && entry.verified);

  return primary?.email.trim().toLowerCase();
}
