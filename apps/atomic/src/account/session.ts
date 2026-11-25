import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';
import type { Session } from './api';

const KEY = 'session';

/** Whether this platform can keep a session. */
export const accountsSupported = true;

/** The session in the platform's keystore, or null when signed out. */
export async function loadSession(): Promise<Session | null> {
  const stored = await getItemAsync(KEY);

  return stored ? (JSON.parse(stored) as Session) : null;
}

export async function saveSession(session: Session): Promise<void> {
  await setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await deleteItemAsync(KEY);
}
