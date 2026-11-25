import {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytes,
} from 'expo-crypto';
import { openAuthSessionAsync } from 'expo-web-browser';
import { exchangeCode, startUrl, type Provider, type Session } from './api';

/** Where the Worker sends the browser back; `scheme` in app.json routes it to the app. */
const RETURN_URL = 'atomic://auth';

/** Why a sign-in ended without a session, as the Worker reports it. */
export class SignInFailed extends Error {
  constructor(readonly reason: string) {
    super(`sign-in failed: ${reason}`);
  }
}

function toBase64Url(base64: string): string {
  return base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** A PKCE pair: the app keeps the verifier and sends the browser its S256 hash. */
async function pkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = toBase64Url(btoa(String.fromCharCode(...getRandomBytes(32))));
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: CryptoEncoding.BASE64,
  });

  return { verifier, challenge: toBase64Url(hash) };
}

function queryParam(url: string, name: string): string | undefined {
  const match = new RegExp(`[?&]${name}=([^&#]*)`).exec(url);

  return match?.[1] === undefined ? undefined : decodeURIComponent(match[1]);
}

/**
 * Opens the provider's sign-in page in the system browser and returns the
 * session it ends with, or null when the person closes the browser.
 */
export async function signIn(provider: Provider): Promise<Session | null> {
  const { verifier, challenge } = await pkce();
  const result = await openAuthSessionAsync(startUrl(provider, challenge), RETURN_URL);

  if (result.type !== 'success') return null;

  const code = queryParam(result.url, 'code');

  if (!code) throw new SignInFailed(queryParam(result.url, 'error') ?? 'failed');

  return exchangeCode(code, verifier);
}
