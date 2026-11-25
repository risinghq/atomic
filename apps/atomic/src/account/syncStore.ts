import { countChanges, type Store } from '@rising/core';
import { exchangeChanges } from './api';

/**
 * Sends what this device changed and takes in what the account holds past
 * the store's cursor, one page per request until the server has no more.
 * Returns how many records arrived.
 */
export async function syncStore(store: Store, token: string): Promise<number> {
  let received = 0;
  let more = true;

  while (more) {
    // Each page depends on the cursor the previous one stored.
    // oxlint-disable-next-line no-await-in-loop
    const [pushed, cursor] = await Promise.all([store.pendingChanges(), store.syncCursor()]);
    // oxlint-disable-next-line no-await-in-loop
    const reply = await exchangeChanges(token, cursor, pushed);

    // oxlint-disable-next-line no-await-in-loop
    await store.completeSync({ pushed, pulled: reply.changes, cursor: reply.cursor });

    received += countChanges(reply.changes);
    more = reply.more;
  }

  return received;
}
