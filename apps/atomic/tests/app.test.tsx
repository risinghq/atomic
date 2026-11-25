import { describe, expect, it, type jest } from '@jest/globals';
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
      haptics: true,
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

describe('settings', () => {
  it('opens the share sheet on a dated CSV file', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await store.addTransaction({
      kind: 'expense',
      amount: 1250,
      categoryId: 'food',
      note: 'Menú',
      at: Date.now(),
    });
    await renderWith(store, <Root />);

    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('button', { name: 'Exportar CSV' }));

    await waitFor(() => expect(nativeSharing.shareAsync).toHaveBeenCalledTimes(1));

    const [uri, options] = (nativeSharing.shareAsync as jest.Mock).mock.lastCall ?? [];
    expect(uri).toMatch(/\/atomic-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(options).toMatchObject({ mimeType: 'text/csv' });
    expect(new File(String(uri)).textSync()).toContain(',gasto,Comida,Menú,12.50\r\n');
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
