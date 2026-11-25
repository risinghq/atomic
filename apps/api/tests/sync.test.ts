import { noChanges as none, type Changes } from '@rising/core';
import { describe, expect, it } from 'vitest';
import { ANA, BETO, send, signIn } from './helpers';

type Reply = { changes: Changes; cursor: string; more: boolean };

/** A device: its token and the cursor of its last sync. */
function device(token: string) {
  let cursor: string | null = null;

  return {
    async sync(push: Partial<Changes> = {}): Promise<Reply> {
      const res = await send('/sync', {
        method: 'POST',
        bearer: token,
        json: { cursor, changes: { ...none(), ...push } },
      });

      expect(res.status).toBe(200);

      const reply = (await res.json()) as Reply;

      cursor = reply.cursor;

      return reply;
    },
  };
}

const lunch = (updatedAt: number, note = 'Menú') => ({
  id: 'tx-1',
  kind: 'expense' as const,
  amount: 1800,
  categoryId: 'food',
  note,
  at: 5,
  updatedAt,
  deleted: false,
});

describe('sync', () => {
  it('carries an expense from one device to the other', async () => {
    const phone = device(await signIn('google', ANA));
    const tablet = device(await signIn('github', ANA));

    await phone.sync({ transactions: [lunch(100)] });

    expect((await tablet.sync()).changes.transactions).toEqual([lunch(100)]);
  });

  it('does not send a device back what it pushed', async () => {
    const phone = device(await signIn('google', ANA));

    expect((await phone.sync({ transactions: [lunch(100)] })).changes).toEqual(none());
    expect((await phone.sync()).changes).toEqual(none());
  });

  it('keeps the newer of two edits, whichever arrives last', async () => {
    const phone = device(await signIn('google', ANA));
    const tablet = device(await signIn('google', ANA));
    const watcher = device(await signIn('google', ANA));

    await tablet.sync({ transactions: [lunch(200, 'Almuerzo')] });

    const late = await phone.sync({ transactions: [lunch(100, 'Menú')] });

    expect(late.changes.transactions).toEqual([lunch(200, 'Almuerzo')]);
    expect((await watcher.sync()).changes.transactions).toEqual([lunch(200, 'Almuerzo')]);
  });

  it('carries a deletion', async () => {
    const phone = device(await signIn('google', ANA));
    const tablet = device(await signIn('google', ANA));

    await phone.sync({ transactions: [lunch(100)] });
    await tablet.sync();
    await phone.sync({ transactions: [{ ...lunch(300), deleted: true }] });

    expect((await tablet.sync()).changes.transactions).toEqual([{ ...lunch(300), deleted: true }]);
  });

  it('carries a recurring transaction', async () => {
    const phone = device(await signIn('google', ANA));
    const tablet = device(await signIn('google', ANA));
    const rent = {
      id: 'rule-1',
      kind: 'expense' as const,
      amount: 120_000,
      categoryId: 'home',
      note: 'Alquiler',
      every: 'month' as const,
      start: 5,
      updatedAt: 100,
      deleted: false,
    };

    await phone.sync({ recurring: [rent] });

    expect((await tablet.sync()).changes.recurring).toEqual([rent]);
  });

  it('shares synced settings', async () => {
    const phone = device(await signIn('google', ANA));
    const tablet = device(await signIn('google', ANA));
    const currency = { key: 'currency', value: '"USD"', updatedAt: 100 };

    await phone.sync({ settings: [currency] });

    expect((await tablet.sync()).changes.settings).toEqual([currency]);
  });

  it('keeps each account to itself', async () => {
    const ana = device(await signIn('google', ANA));
    const beto = device(await signIn('google', BETO));

    await ana.sync({ transactions: [lunch(100)] });

    expect((await beto.sync()).changes).toEqual(none());
  });

  it('hands a new device a long history in pages', async () => {
    const phone = device(await signIn('google', ANA));
    const tablet = device(await signIn('google', ANA));
    const many = Array.from({ length: 2500 }, (_, i) => ({ ...lunch(100), id: `tx-${i}` }));

    await phone.sync({ transactions: many });

    const first = await tablet.sync();
    const second = await tablet.sync();

    expect(first.more).toBe(true);
    expect(second.more).toBe(false);
    expect(first.changes.transactions.length + second.changes.transactions.length).toBe(2500);
  });

  it('refuses malformed changes', async () => {
    const token = await signIn('google', ANA);
    const push = (changes: unknown, cursor: unknown = null) =>
      send('/sync', { method: 'POST', bearer: token, json: { cursor, changes } });

    expect((await push(undefined)).status).toBe(400);
    expect((await push({ transactions: 'x' })).status).toBe(400);
    expect((await push({ transactions: [{ ...lunch(1), id: '' }] })).status).toBe(400);
    expect((await push({ transactions: [{ ...lunch(1), updatedAt: 'now' }] })).status).toBe(400);
    expect(
      (await push({ settings: [{ key: 'onboarded', value: 'true', updatedAt: 1 }] })).status
    ).toBe(400);
    expect((await push(none(), 'abc')).status).toBe(400);
  });
});

describe('deleting', () => {
  it('erases the synced data and keeps the account', async () => {
    const phone = device(await signIn('google', ANA));
    const token = await signIn('google', ANA);
    const tablet = device(token);

    await phone.sync({ transactions: [lunch(100)] });

    expect((await send('/data', { method: 'DELETE', bearer: token })).status).toBe(204);
    expect((await tablet.sync()).changes).toEqual(none());
    expect((await send('/me', { bearer: token })).status).toBe(200);
  });

  it('deletes the account and signs out every device', async () => {
    const phone = await signIn('google', ANA);
    const tablet = await signIn('github', ANA);

    await device(phone).sync({ transactions: [lunch(100)] });

    expect((await send('/account', { method: 'DELETE', bearer: phone })).status).toBe(204);
    expect((await send('/me', { bearer: tablet })).status).toBe(401);

    const again = device(await signIn('google', ANA));

    expect((await again.sync()).changes).toEqual(none());
  });
});
