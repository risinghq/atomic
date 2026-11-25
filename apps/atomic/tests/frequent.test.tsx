import { describe, expect, it } from '@jest/globals';
import { screen, userEvent } from '@testing-library/react-native';
import type { Store } from '@rising/core';
import { Root } from '../src/Root';
import { freshStore, renderWith } from './render';

const day = 24 * 60 * 60 * 1000;

async function record(store: Store, categoryId: string, note: string, amount: number, daysAgo = 0) {
  const at = Date.now() - daysAgo * day;
  await store.addTransaction({ kind: 'expense', amount, categoryId, note, at });
}

async function openEntry() {
  const user = userEvent.setup();
  await user.press(await screen.findByRole('button', { name: 'Agregar' }));

  return user;
}

describe('frequent entries', () => {
  it('records an entry made twice before in one tap', async () => {
    const store = await freshStore();

    await record(store, 'food', 'Café', 850, 2);
    await record(store, 'food', 'Café', 850, 1);
    await record(store, 'transport', 'Taxi', 1_500, 1);

    await renderWith(store, <Root />);
    const user = await openEntry();

    expect(screen.queryByRole('button', { name: /Taxi · / })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Café · S\/ 8\.50/ }));

    expect(await screen.findByText('Gasto guardado')).toBeOnTheScreen();
    expect(await store.transactions()).toHaveLength(4);
  });

  it('forgets an entry last made more than 90 days ago', async () => {
    const store = await freshStore();

    await record(store, 'food', 'Café', 850, 120);
    await record(store, 'food', 'Café', 850, 100);

    await renderWith(store, <Root />);
    await openEntry();

    expect(screen.queryByRole('button', { name: /Café · / })).not.toBeOnTheScreen();
  });

  it('offers income entries once the kind is Ingreso', async () => {
    const store = await freshStore();

    const salary = { kind: 'income', amount: 300_000, categoryId: 'salary', note: '' } as const;

    await store.addTransaction({ ...salary, at: Date.now() - 31 * day });
    await store.addTransaction({ ...salary, at: Date.now() - day });

    await renderWith(store, <Root />);
    const user = await openEntry();

    expect(screen.queryByRole('button', { name: /Sueldo · / })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Ingreso' }));

    expect(screen.getByRole('button', { name: /Sueldo · S\/ 3,000\.00/ })).toBeOnTheScreen();
  });
});
