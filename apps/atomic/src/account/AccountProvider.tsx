import type { Store } from '@rising/core';
import { useToast } from '@rising/ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useData } from '../data/DataProvider';
import * as api from './api';
import { accountsSupported, clearSession, loadSession, saveSession } from './session';
import { signIn as browserSignIn } from './signIn';
import { syncStore } from './syncStore';

/** `offline` means the last sync failed; the next write or return to the app retries it. */
export type SyncStatus = 'idle' | 'syncing' | 'offline';

/** How a sign-in ended: with an account that already held data, a new one, or not at all. */
export type SignInResult = 'returning' | 'new' | 'cancelled';

export type Account = {
  supported: boolean;
  email: string | null;
  status: SyncStatus;
  signIn: (provider: api.Provider) => Promise<SignInResult>;

  /** Emails a sign-in code to the address. */
  sendCode: (email: string) => Promise<void>;
  signInWithCode: (email: string, code: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  /** Deletes the account's synced records and keeps it signed in. */
  eraseCloud: () => Promise<void>;
};

const AccountContext = createContext<Account | null>(null);

/**
 * Owns the session and keeps the store in step with the account: it syncs
 * when the session starts, after every write and when the app comes back to
 * the foreground. One sync runs at a time; a request during one runs once
 * after it.
 */
export function AccountProvider({ store, children }: { store: Store; children: ReactNode }) {
  const { reload, writes } = useData();
  const toast = useToast();
  const [session, setSession] = useState<api.Session | null>(null);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const running = useRef<Promise<number | null> | null>(null);
  const again = useRef(false);

  useEffect(() => {
    void loadSession().then(setSession);
  }, []);

  /** Forgets the session on this device. The records stay and go to the next account. */
  const leave = useCallback(async () => {
    await clearSession();
    await store.forgetSync();
    setSession(null);
    setStatus('idle');
  }, [store]);

  /** Resolves to how many records arrived, or null when the sync failed. */
  const sync = useCallback(
    async (token: string): Promise<number | null> => {
      if (running.current) {
        again.current = true;
        return running.current.then(() => 0);
      }

      async function run(): Promise<number | null> {
        let received = 0;
        let failed = false;

        setStatus('syncing');

        try {
          do {
            again.current = false;
            // A request that arrived mid-sync needs this pass; it cannot overlap the last.
            // oxlint-disable-next-line no-await-in-loop
            received += await syncStore(store, token);
          } while (again.current);

          setStatus('idle');
        } catch (error) {
          failed = true;

          if (error instanceof api.SignedOut) {
            await leave();
            toast({ text: 'Tu sesión terminó. Los datos siguen en este dispositivo.' });
          } else {
            setStatus('offline');
          }
        }

        // A failed sync may have stored some pages before it stopped.
        if (received > 0 || failed) await reload();

        return failed ? null : received;
      }

      running.current = run();

      try {
        return await running.current;
      } finally {
        running.current = null;
      }
    },
    [store, reload, leave, toast]
  );

  const token = session?.token;

  // `writes` is the trigger: each local write is sent as soon as it lands.
  /* oxlint-disable react/exhaustive-effect-dependencies */
  useEffect(() => {
    if (token) void sync(token);
  }, [token, writes, sync]);
  /* oxlint-enable react/exhaustive-effect-dependencies */

  useEffect(() => {
    if (!token) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync(token);
    });

    return () => subscription.remove();
  }, [token, sync]);

  /** Keeps a new session once its first sync has answered. */
  const begin = useCallback(
    async (started: api.Session): Promise<SignInResult> => {
      // Whether the account already holds data decides what onboarding keeps,
      // so the sign-in only counts once the first sync has answered.
      const received = await sync(started.token);

      if (received === null) {
        await api.endSession(started.token).catch(() => undefined);
        await leave();
        throw new Error('The first sync after signing in failed');
      }

      await saveSession(started);
      setSession(started);

      return received > 0 ? 'returning' : 'new';
    },
    [sync, leave]
  );

  const signIn = useCallback(
    async (provider: api.Provider): Promise<SignInResult> => {
      const started = await browserSignIn(provider);

      return started ? begin(started) : 'cancelled';
    },
    [begin]
  );

  const signInWithCode = useCallback(
    async (email: string, code: string): Promise<SignInResult> =>
      begin(await api.verifyEmailCode(email, code)),
    [begin]
  );

  const signOut = useCallback(async () => {
    if (!token) return;

    // The device forgets the token either way; the server drops it when it can.
    await api.endSession(token).catch(() => undefined);
    await leave();
  }, [token, leave]);

  const deleteAccount = useCallback(async () => {
    if (!token) return;

    await api.deleteAccount(token);
    await leave();
  }, [token, leave]);

  const eraseCloud = useCallback(async () => {
    if (token) await api.deleteData(token);
  }, [token]);

  const account = useMemo<Account>(
    () => ({
      supported: accountsSupported,
      email: session?.email ?? null,
      status,
      signIn,
      sendCode: api.requestEmailCode,
      signInWithCode,
      signOut,
      deleteAccount,
      eraseCloud,
    }),
    [session, status, signIn, signInWithCode, signOut, deleteAccount, eraseCloud]
  );

  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount must be called inside an AccountProvider');
  return account;
}
