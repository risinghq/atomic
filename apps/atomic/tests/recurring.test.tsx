import { describe, expect, it } from '@jest/globals';
import { screen, userEvent } from '@testing-library/react-native';
import { Root } from '../src/Root';
import { freshStore, renderWith } from './render';

const DAY = 24 * 60 * 60 * 1000;

const rent = {
  kind: 'expense' as const,
  amount: 120_000,
  categoryId: 'home',
  note: 'Alquiler',
  every: 'month' as const,
};

describe('recurring transactions', () => {
  it('records a monthly expense now and lists it under Recurrentes', async () => {
    const store = await freshStore();
    const user = userEvent.setup();

    await renderWith(store, <Root />);
    await user.press(await screen.findByRole('button', { name: 'Agregar' }));
    await user.press(screen.getByRole('button', { name: '1' }));
    await user.press(screen.getByRole('button', { name: '2' }));
    await user.press(screen.getByRole('button', { name: '0' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar' }));
    await user.press(screen.getByRole('tab', { name: 'Mensual' }));
    await user.press(screen.getByRole('radio', { name: 'Casa' }));

    expect(await store.recurring()).toEqual([
      expect.objectContaining({ amount: 12_000, categoryId: 'home', every: 'month' }),
    ]);
    expect(await store.transactions()).toEqual([
      expect.objectContaining({ amount: 12_000, categoryId: 'home' }),
    ]);

    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('button', { name: 'Recurrentes' }));

    expect(await screen.findByText(/^Cada mes · próximo:/)).toBeOnTheScreen();
  });

  it('leaves an entry that does not repeat as a single transaction', async () => {
    const store = await freshStore();
    const user = userEvent.setup();

    await renderWith(store, <Root />);
    await user.press(await screen.findByRole('button', { name: 'Agregar' }));
    await user.press(screen.getByRole('button', { name: '5' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar' }));
    await user.press(screen.getByRole('radio', { name: 'Casa' }));

    expect(await store.recurring()).toEqual([]);
    expect(await store.transactions()).toHaveLength(1);
  });

  it('records the occurrences that came due while the app was closed', async () => {
    const start = Date.now() - 15 * DAY;
    let clock = start;
    const store = await freshStore({ now: () => clock });

    await store.addRecurring({ ...rent, every: 'week', start });

    clock = Date.now();
    await renderWith(store, <Root />);

    expect(await screen.findAllByText('Alquiler')).toHaveLength(3);
  });

  it('stops a recurring expense and keeps what it recorded', async () => {
    const store = await freshStore();
    const user = userEvent.setup();

    await store.addRecurring({ ...rent, start: Date.now() });
    await renderWith(store, <Root />);
    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('button', { name: 'Recurrentes' }));
    await user.press(await screen.findByRole('button', { name: /^Alquiler/ }));
    await user.press(screen.getByRole('button', { name: 'Dejar de repetir' }));

    expect(await screen.findByText('No hay movimientos recurrentes')).toBeOnTheScreen();
    expect(await store.recurring()).toEqual([]);
    expect(await store.transactions()).toHaveLength(1);
  });
});
