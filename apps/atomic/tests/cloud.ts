import { noChanges, type Changes } from '@atomic/core';
import { jest } from '@jest/globals';
// jest-expo stands each native module in with a recorder. These three are the
// device's keystore, its browser and its hash function.
import nativeKeystore from 'expo-secure-store/build/ExpoSecureStore';
import { createHash } from 'node:crypto';
import { API_URL, type Session } from '../src/account/api';
import { recorderOf } from './native';

const nativeCrypto = recorderOf<'digestStringAsync'>('expo-crypto', 'ExpoCrypto');
const nativeBrowser = recorderOf<'openAuthSessionAsync'>('expo-web-browser', 'ExpoWebBrowser');

type Kind = keyof Changes;
type Stored = { kind: Kind; record: { updatedAt: number }; seq: number };
type Account = { records: Map<string, Stored>; seq: number };
type Reply = { status: number; body?: unknown };

/**
 * The Worker's contract from docs/api.md, kept in memory: PKCE sign-in, the
 * newer record wins, pages past a cursor, and the delete routes. The app
 * reaches it through `fetch`, the one network boundary it has.
 */
export class FakeCloud {
  readonly accounts = new Map<string, Account>();
  readonly sessions = new Map<string, string>();
  private readonly logins = new Map<string, { challenge: string; email: string }>();
  private next = 0;

  /** The email the provider's page signs in as; null makes the person close the browser. */
  signingInAs: string | null = 'ana@example.com';

  /** When false, sign-in starts answer as a deploy without OAuth secrets does. */
  providersSetUp = true;

  /** When false, every request fails as if the phone had no connection. */
  online = true;

  /** When true, the connection drops as soon as a sign-in hands out its session. */
  dropsAfterSignIn = false;

  /** The most records one sync hands back. */
  pageSize = 2000;

  /** Installs the cloud behind `fetch`, the browser and the keystore. Returns the keystore. */
  install(): Map<string, string> {
    const keystore = new Map<string, string>();

    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (!this.online) throw new TypeError('Network request failed');

      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const token = headers.authorization?.replace('Bearer ', '');
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const reply = this.handle(init?.method ?? 'GET', url.replace(API_URL, ''), token, body);

      return {
        status: reply.status,
        ok: reply.status < 400,
        json: async () => reply.body,
      } as Response;
    });

    jest.mocked(nativeBrowser.openAuthSessionAsync).mockImplementation(async (url: string) => {
      if (!this.providersSetUp) return { type: 'success', url: 'atomic://auth?error=unavailable' };
      if (!this.signingInAs) return { type: 'cancel' };

      const challenge = /challenge=([^&]+)/.exec(url)?.[1] ?? '';
      const code = `code-${(this.next += 1)}`;

      this.logins.set(code, { challenge, email: this.signingInAs });

      return { type: 'success', url: `atomic://auth?code=${code}` };
    });

    jest
      .mocked(nativeCrypto.digestStringAsync)
      .mockImplementation(async (_algorithm: string, data: string) =>
        createHash('sha256').update(data).digest('base64')
      );

    jest
      .mocked(nativeKeystore.getValueWithKeyAsync)
      .mockImplementation(async (key: string) => keystore.get(key) ?? null);
    jest
      .mocked(nativeKeystore.setValueWithKeyAsync)
      .mockImplementation(async (value: string, key: string) => void keystore.set(key, value));
    jest
      .mocked(nativeKeystore.deleteValueWithKeyAsync)
      .mockImplementation(async (key: string) => void keystore.delete(key));

    return keystore;
  }

  /** A session the device already holds, as after an earlier sign-in. */
  session(email: string): Session {
    const token = `token-${(this.next += 1)}`;

    this.sessions.set(token, email);
    this.account(email);

    return { token, email };
  }

  account(email: string): Account {
    const known = this.accounts.get(email);
    if (known) return known;

    const created = { records: new Map(), seq: 0 };
    this.accounts.set(email, created);
    return created;
  }

  /** What the account holds, in the shape a sync hands back. */
  held(email: string): Changes {
    const changes = noChanges();

    for (const { kind, record } of this.account(email).records.values()) {
      (changes[kind] as unknown[]).push(record);
    }

    return changes;
  }

  /** Writes records as another device of the account would. */
  push(email: string, changes: Partial<Changes>): void {
    this.store(this.account(email), { ...noChanges(), ...changes });
  }

  private store(account: Account, changes: Changes): void {
    for (const kind of Object.keys(changes) as Kind[]) {
      for (const record of changes[kind]) {
        const id = 'id' in record ? record.id : record.key;
        const known = account.records.get(`${kind}:${id}`);

        if (known && known.record.updatedAt >= record.updatedAt) continue;

        account.seq += 1;
        account.records.set(`${kind}:${id}`, { kind, record, seq: account.seq });
      }
    }
  }

  private handle(method: string, path: string, token?: string, body?: any): Reply {
    if (method === 'POST' && path === '/auth/token') {
      const login = this.logins.get(body.code);
      const hash = createHash('sha256').update(body.verifier).digest('base64url');

      if (!login || login.challenge !== hash) return { status: 400 };

      this.logins.delete(body.code);

      if (this.dropsAfterSignIn) this.online = false;

      return { status: 200, body: this.session(login.email) };
    }

    const email = token ? this.sessions.get(token) : undefined;

    if (!email) return { status: 401 };

    const account = this.account(email);

    if (method === 'POST' && path === '/sync') {
      const before = account.seq;
      const after = Number(body.cursor ?? 0) > before ? 0 : Number(body.cursor ?? 0);

      this.store(account, body.changes);

      const page = [...account.records.values()]
        .filter((stored) => stored.seq > after && stored.seq <= before)
        .sort((a, b) => a.seq - b.seq);
      const shown = page.slice(0, this.pageSize);
      const changes = noChanges();

      for (const { kind, record } of shown) (changes[kind] as unknown[]).push(record);

      const more = page.length > shown.length;

      return {
        status: 200,
        body: { changes, cursor: String(more ? shown.at(-1)!.seq : account.seq), more },
      };
    }

    if (method === 'DELETE' && path === '/session') {
      this.sessions.delete(token!);
      return { status: 204 };
    }

    if (method === 'DELETE' && path === '/data') {
      account.records.clear();
      return { status: 204 };
    }

    if (method === 'DELETE' && path === '/account') {
      this.accounts.delete(email);

      for (const [held, owner] of this.sessions) if (owner === email) this.sessions.delete(held);

      return { status: 204 };
    }

    return { status: 404 };
  }
}
