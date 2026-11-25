import type { Changes } from '@atomic/core';

/** The Worker in `apps/api`. `EXPO_PUBLIC_API_URL` points a build at another one. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://atomic.rising.sh';

export type Provider = 'google' | 'github';

/** A signed-in account on this device. */
export type Session = { token: string; email: string };

export type SyncReply = { changes: Changes; cursor: string; more: boolean };

/** The server no longer accepts the token: it was signed out or the account was deleted. */
export class SignedOut extends Error {}

type Call = { token?: string; method?: string; json?: unknown };

async function call(path: string, { token, method = 'GET', json }: Call): Promise<Response> {
  const headers: Record<string, string> = {};

  if (token) headers.authorization = `Bearer ${token}`;
  if (json !== undefined) headers['content-type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: json === undefined ? undefined : JSON.stringify(json),
  });

  if (response.status === 401) throw new SignedOut();
  if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}`);

  return response;
}

export function startUrl(provider: Provider, challenge: string): string {
  return `${API_URL}/auth/${provider}/start?challenge=${challenge}`;
}

/** Trades the one-time code from the sign-in redirect for a session. */
export async function exchangeCode(code: string, verifier: string): Promise<Session> {
  const response = await call('/auth/token', { method: 'POST', json: { code, verifier } });

  return (await response.json()) as Session;
}

/** Sends this device's changes and receives one page of the account's. */
export async function exchangeChanges(
  token: string,
  cursor: string | null,
  changes: Changes
): Promise<SyncReply> {
  const response = await call('/sync', { token, method: 'POST', json: { cursor, changes } });

  return (await response.json()) as SyncReply;
}

export async function endSession(token: string): Promise<void> {
  await call('/session', { token, method: 'DELETE' });
}

export async function deleteData(token: string): Promise<void> {
  await call('/data', { token, method: 'DELETE' });
}

export async function deleteAccount(token: string): Promise<void> {
  await call('/account', { token, method: 'DELETE' });
}
