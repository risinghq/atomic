import type { Session } from './api';

// The web build has no keystore, and the sign-in redirect targets the app's
// scheme, so the web build stays signed out.
export const accountsSupported = false;

export async function loadSession(): Promise<Session | null> {
  return null;
}

export async function saveSession(): Promise<void> {}

export async function clearSession(): Promise<void> {}
