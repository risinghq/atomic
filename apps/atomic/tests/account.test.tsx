import type { Store } from '@atomic/core';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { Root } from '../src/Root';
import { FakeCloud } from './cloud';
import { freshStore, renderWith } from './render';

const ANA = 'ana@example.com';

const lunch = {
  id: 'tx-lunch',
  kind: 'expense' as const,
  amount: 1800,
  categoryId: 'food',
  note: 'Menú del día',
  at: Date.now(),
  updatedAt: 100,
  deleted: false,
};

const noted = (id: string) => ({ ...lunch, id, note: `Nota ${id}` });

let cloud: FakeCloud;
let keystore: Map<string, string>;

beforeEach(() => {
  cloud = new FakeCloud();
  keystore = cloud.install();
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** A device that signed in to the account on an earlier run of the app. */
function signedInBefore(email: string) {
  keystore.set('session', JSON.stringify(cloud.session(email)));
}

async function openSettings(store: Store) {
  const user = userEvent.setup();

  await renderWith(store, <Root />);
  await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));

  return user;
}

describe('signing in', () => {
  it('signs in from Ajustes and sends what the device already holds', async () => {
    const store = await freshStore();
    const added = await store.addTransaction({ ...lunch, note: 'Taxi' });
    const user = await openSettings(store);

    await user.press(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByText(ANA)).toBeOnTheScreen();
    expect(await screen.findByText('Sincronizado')).toBeOnTheScreen();
    expect(cloud.held(ANA).transactions).toMatchObject([{ id: added.id, note: 'Taxi' }]);
    expect(keystore.has('session')).toBe(true);
  });

  it('brings a returning account into onboarding, with its currency', async () => {
    const user = userEvent.setup();
    const store = await freshStore({ onboarded: false });

    cloud.push(ANA, {
      transactions: [lunch],
      settings: [{ key: 'currency', value: '"USD"', updatedAt: 50 }],
    });
    await renderWith(store, <Root />);

    await user.press(await screen.findByRole('button', { name: 'Continuar con Google' }));

    expect(await screen.findByText('Menú del día')).toBeOnTheScreen();
    expect(await store.settings()).toMatchObject({ onboarded: true, currency: 'USD' });
  });

  it('keeps the onboarding choices for a new account', async () => {
    const user = userEvent.setup();
    const store = await freshStore({ onboarded: false });
    await renderWith(store, <Root />);

    await user.press(await screen.findByRole('tab', { name: '$ Dólares' }));
    await user.press(screen.getByRole('button', { name: 'Continuar con GitHub' }));

    expect(await screen.findByRole('header', { name: 'Registro' })).toBeOnTheScreen();
    expect(await store.settings()).toMatchObject({ onboarded: true, currency: 'USD' });
    await waitFor(() =>
      expect(cloud.held(ANA).settings).toContainEqual(expect.objectContaining({ key: 'currency' }))
    );
  });

  it('changes nothing when the person closes the browser', async () => {
    const store = await freshStore();
    cloud.signingInAs = null;
    const user = await openSettings(store);

    await user.press(screen.getByRole('button', { name: 'Continuar con Google' }));

    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeOnTheScreen();
    expect(keystore.has('session')).toBe(false);
  });

  it('says so when a provider is not set up yet', async () => {
    const store = await freshStore();
    cloud.providersSetUp = false;
    const user = await openSettings(store);

    await user.press(screen.getByRole('button', { name: 'Continuar con GitHub' }));

    expect(
      await screen.findByText('Este inicio de sesión aún no está disponible.')
    ).toBeOnTheScreen();
    expect(keystore.has('session')).toBe(false);
  });
});

describe('syncing', () => {
  it('sends an expense to the account as soon as it is saved', async () => {
    const store = await freshStore();
    signedInBefore(ANA);
    await renderWith(store, <Root />);
    await screen.findByRole('header', { name: 'Registro' });

    await store.addTransaction({ ...lunch, note: 'Café' });
    // Nothing else writes here, so a settings change stands in for the next tap.
    await openSettings(store);
    await userEvent.setup().press(await screen.findByRole('tab', { name: '€ Euros' }));

    await waitFor(() => expect(cloud.held(ANA).transactions).toMatchObject([{ note: 'Café' }]));
  });

  it('pulls a long history page by page', async () => {
    const store = await freshStore();
    cloud.pageSize = 2;
    cloud.push(ANA, { transactions: ['a', 'b', 'c', 'd', 'e'].map(noted) });
    signedInBefore(ANA);
    await renderWith(store, <Root />);

    expect(await screen.findByText('Nota e')).toBeOnTheScreen();
    expect(await store.transactions()).toHaveLength(5);
  });

  it('shows when the device is offline and keeps the change for later', async () => {
    const store = await freshStore();
    cloud.online = false;
    signedInBefore(ANA);
    await store.addTransaction(lunch);
    await openSettings(store);

    expect(await screen.findByText('Sin conexión. Se sincroniza al volver.')).toBeOnTheScreen();
    expect((await store.pendingChanges()).transactions).toHaveLength(1);
  });

  it('signs the device out when the account was deleted elsewhere', async () => {
    const store = await freshStore();
    signedInBefore(ANA);
    cloud.sessions.clear();
    await openSettings(store);

    expect(
      await screen.findByText('Tu sesión terminó. Los datos siguen en este dispositivo.')
    ).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeOnTheScreen();
  });
});

describe('leaving', () => {
  it('signs out, keeps the data and hands it all to the next account', async () => {
    const store = await freshStore();
    signedInBefore(ANA);
    await store.addTransaction(lunch);
    const user = await openSettings(store);
    await screen.findByText('Sincronizado');

    await user.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeOnTheScreen();
    expect(cloud.sessions.size).toBe(0);
    expect(keystore.has('session')).toBe(false);
    expect(await store.transactions()).toHaveLength(1);

    cloud.signingInAs = 'beto@example.com';
    await user.press(screen.getByRole('button', { name: 'Continuar con Google' }));

    await waitFor(() => expect(cloud.held('beto@example.com').transactions).toHaveLength(1));
  });

  it('deletes the account after a confirmation', async () => {
    const store = await freshStore();
    signedInBefore(ANA);
    await store.addTransaction(lunch);
    const user = await openSettings(store);
    await screen.findByText('Sincronizado');

    await user.press(screen.getByRole('button', { name: 'Eliminar cuenta' }));
    await user.press((await screen.findAllByRole('button', { name: 'Eliminar cuenta' })).at(-1)!);

    expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeOnTheScreen();
    expect(cloud.accounts.has(ANA)).toBe(false);
    expect(await store.transactions()).toHaveLength(1);
  });

  it('erases the account data along with the device data', async () => {
    const store = await freshStore();
    signedInBefore(ANA);
    await store.addTransaction(lunch);
    const user = await openSettings(store);
    await screen.findByText('Sincronizado');

    await user.press(screen.getByRole('button', { name: 'Borrar todos los datos' }));
    await user.press(await screen.findByRole('button', { name: 'Borrar todo' }));

    expect(await screen.findByRole('button', { name: 'Empezar' })).toBeOnTheScreen();
    expect(cloud.held(ANA).transactions).toEqual([]);
    expect(await store.transactions()).toEqual([]);
  });

  it('keeps everything when the account data cannot be erased', async () => {
    const store = await freshStore();
    signedInBefore(ANA);
    await store.addTransaction(lunch);
    const user = await openSettings(store);
    await screen.findByText('Sincronizado');
    cloud.online = false;

    await user.press(screen.getByRole('button', { name: 'Borrar todos los datos' }));
    await user.press(await screen.findByRole('button', { name: 'Borrar todo' }));

    expect(await screen.findByText('No se pudo borrar. Revisa tu conexión.')).toBeOnTheScreen();
    expect(await store.transactions()).toHaveLength(1);
    expect(cloud.held(ANA).transactions).toHaveLength(1);
  });
});
