import { afterEach, describe, expect, it, type jest } from '@jest/globals';
import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { File } from 'expo-file-system';
// The native module behind expo-sharing. jest-expo stands it in with a recorder,
// so this is the call the OS share sheet would receive.
import nativeSharing from 'expo-sharing/build/SharingNativeModule';
import { Root } from '../src/Root';
import { freshStore, renderWith } from './render';

async function typeAmount(user: ReturnType<typeof userEvent.setup>, digits: string) {
  // A user presses the keys one after another; the pad reads them in order.
  // oxlint-disable-next-line no-await-in-loop
  for (const digit of digits) await user.press(screen.getByRole('button', { name: digit }));
}

describe('onboarding', () => {
  it('saves the chosen currency and week start, then opens the app', async () => {
    const user = userEvent.setup();
    const store = await freshStore({ onboarded: false });
    await renderWith(store, <Root />);

    await user.press(await screen.findByRole('tab', { name: '$ Dólares' }));
    await user.press(screen.getByRole('tab', { name: 'Domingo' }));
    await user.press(screen.getByRole('button', { name: 'Empezar' }));

    expect(await screen.findByRole('header', { name: 'Registro' })).toBeOnTheScreen();
    expect(await store.settings()).toEqual({
      onboarded: true,
      currency: 'USD',
      weekStart: 0,
      haptics: 'essential',
      lock: false,
    });
  });
});

describe('entry', () => {
  it('records an expense with the amount, a note and a category', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await renderWith(store, <Root />);

    await user.press(await screen.findByRole('button', { name: 'Agregar' }));
    await typeAmount(user, '18');
    await user.press(screen.getByRole('button', { name: 'Confirmar' }));
    await user.type(screen.getByPlaceholderText('Nota (opcional)'), ' Menú ');
    await user.press(screen.getByRole('radio', { name: 'Comida' }));

    expect(await screen.findByRole('button', { name: 'Menú' })).toBeOnTheScreen();

    const [saved] = await store.transactions();
    expect(saved).toMatchObject({
      kind: 'expense',
      amount: 1800,
      categoryId: 'food',
      note: 'Menú',
    });
  });

  it('deletes a transaction after a long press and a confirmation', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await store.addTransaction({
      kind: 'expense',
      amount: 500,
      categoryId: 'transport',
      note: '',
      at: Date.now(),
    });
    await renderWith(store, <Root />);

    await user.longPress(await screen.findByRole('button', { name: 'Transporte' }));
    await user.press(await screen.findByRole('button', { name: 'Borrar' }));

    expect(await screen.findByText('Aún no hay movimientos')).toBeOnTheScreen();
    expect(await store.transactions()).toEqual([]);
  });
});

describe('budgets', () => {
  it('creates a monthly budget for one category', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await renderWith(store, <Root />);

    await user.press(await screen.findByRole('tab', { name: 'Presupuestos' }));
    await user.press(screen.getByRole('button', { name: 'Crear presupuesto' }));
    await user.press(screen.getByRole('radio', { name: 'Comida' }));
    await typeAmount(user, '300');
    await user.press(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByRole('button', { name: 'Comida' })).toBeOnTheScreen();
    expect(await store.budgets()).toMatchObject([
      { categoryId: 'food', amount: 30000, period: 'month' },
    ]);
  });
});

async function exportAs(user: ReturnType<typeof userEvent.setup>, choice: string) {
  await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
  await user.press(screen.getByRole('button', { name: 'Exportar CSV' }));
  await user.press(await screen.findByRole('button', { name: new RegExp(`^${choice}`) }));

  await waitFor(() => expect(nativeSharing.shareAsync).toHaveBeenCalledTimes(1));

  const [uri, options] = (nativeSharing.shareAsync as jest.Mock).mock.lastCall ?? [];
  expect(options).toMatchObject({ mimeType: 'text/csv' });

  return { uri: String(uri), text: new File(String(uri)).textSync() };
}

async function storeWithTwoYears() {
  const store = await freshStore();
  const lastYear = new Date(new Date().getFullYear() - 1, 5, 15).getTime();

  await store.addTransaction({
    kind: 'expense',
    amount: 1250,
    categoryId: 'food',
    note: 'Menú',
    at: Date.now(),
  });
  await store.addTransaction({
    kind: 'expense',
    amount: 9900,
    categoryId: 'travel',
    note: 'Pasaje',
    at: lastYear,
  });

  return store;
}

describe('settings', () => {
  afterEach(() => {
    (nativeSharing.shareAsync as jest.Mock).mockClear();
  });

  it("shares this month's transactions in a file named for the month", async () => {
    const user = userEvent.setup();
    await renderWith(await storeWithTwoYears(), <Root />);

    const { uri, text } = await exportAs(user, 'Este mes');

    expect(uri).toMatch(/\/atomic-\d{4}-\d{2}\.csv$/);
    expect(text).toContain(',gasto,Comida,Menú,12.50\r\n');
    expect(text).not.toContain('Pasaje');
  });

  it('shares every transaction in a dated file', async () => {
    const user = userEvent.setup();
    await renderWith(await storeWithTwoYears(), <Root />);

    const { uri, text } = await exportAs(user, 'Todo');

    expect(uri).toMatch(/\/atomic-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(text).toContain(',gasto,Comida,Menú,12.50\r\n');
    expect(text).toContain(',gasto,Viajes,Pasaje,99.00\r\n');
  });

  it('saves the chosen vibration level', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await renderWith(store, <Root />);

    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('tab', { name: 'Toda' }));

    await waitFor(async () => expect(await store.settings()).toMatchObject({ haptics: 'all' }));
    expect(screen.getByRole('tab', { name: 'Toda' })).toBeSelected();
  });

  it('erases every record after a confirmation and returns to onboarding', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await store.addTransaction({
      kind: 'expense',
      amount: 500,
      categoryId: 'transport',
      note: '',
      at: Date.now(),
    });
    await store.setBudget({ categoryId: null, amount: 10000, period: 'month' });
    await renderWith(store, <Root />);

    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('button', { name: 'Borrar todos los datos' }));
    await user.press(await screen.findByRole('button', { name: 'Borrar todo' }));

    expect(await screen.findByRole('button', { name: 'Empezar' })).toBeOnTheScreen();
    expect(await store.transactions()).toEqual([]);
    expect(await store.budgets()).toEqual([]);
    expect((await store.categories()).length).toBeGreaterThan(0);
  });
});
