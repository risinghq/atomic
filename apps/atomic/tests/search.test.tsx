import { describe, expect, it } from '@jest/globals';
import { screen, userEvent } from '@testing-library/react-native';
import type { Store } from '@rising/core';
import { Root } from '../src/Root';
import { freshStore, renderWith } from './render';

async function record(store: Store, categoryId: string, note: string, amount: number) {
  await store.addTransaction({ kind: 'expense', amount, categoryId, note, at: Date.now() });
}

async function storeWithSpending() {
  const store = await freshStore();

  await record(store, 'food', 'Café con Ana', 1_250);
  await record(store, 'transport', 'Taxi al aeropuerto', 4_500);
  await record(store, 'food', 'Menú', 1_800);

  return store;
}

describe('searching the log', () => {
  it('finds a note without its accents and shows what the results add up to', async () => {
    const user = userEvent.setup();
    await renderWith(await storeWithSpending(), <Root />);

    await user.type(await screen.findByLabelText('Buscar'), 'cafe');

    expect(screen.getByText('Café con Ana')).toBeOnTheScreen();
    expect(screen.queryByText('Taxi al aeropuerto')).not.toBeOnTheScreen();
    expect(screen.queryByText('Menú')).not.toBeOnTheScreen();
    expect(screen.getByText('1 MOVIMIENTO')).toBeOnTheScreen();
  });

  it('finds every transaction of a category by its name', async () => {
    const user = userEvent.setup();
    await renderWith(await storeWithSpending(), <Root />);

    await user.type(await screen.findByLabelText('Buscar'), 'comida');

    expect(screen.getByText('Café con Ana')).toBeOnTheScreen();
    expect(screen.getByText('Menú')).toBeOnTheScreen();
    expect(screen.queryByText('Taxi al aeropuerto')).not.toBeOnTheScreen();
    expect(screen.getByText('2 MOVIMIENTOS')).toBeOnTheScreen();
  });

  it('finds an amount', async () => {
    const user = userEvent.setup();
    await renderWith(await storeWithSpending(), <Root />);

    await user.type(await screen.findByLabelText('Buscar'), '45');

    expect(screen.getByText('Taxi al aeropuerto')).toBeOnTheScreen();
    expect(screen.queryByText('Café con Ana')).not.toBeOnTheScreen();
  });

  it('says when nothing matches, and shows everything again once cleared', async () => {
    const user = userEvent.setup();
    await renderWith(await storeWithSpending(), <Root />);

    const field = await screen.findByLabelText('Buscar');
    await user.type(field, 'cine');

    expect(screen.getByText('Sin resultados')).toBeOnTheScreen();

    await user.clear(field);

    expect(screen.getByText('NETO ESTE MES')).toBeOnTheScreen();
    expect(screen.getByText('Taxi al aeropuerto')).toBeOnTheScreen();
    expect(screen.getByText('Menú')).toBeOnTheScreen();
  });
});
