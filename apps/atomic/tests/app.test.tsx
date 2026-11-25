import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Root } from '../src/Root';
import { freshStore, renderWith } from './render';

afterEach(cleanup);

function press(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

// React Native Web fires onLongPress once a press, here a held mouse button, outlasts its delay.
async function longPress(element: HTMLElement) {
  fireEvent.mouseDown(element, { button: 0, buttons: 1 });
  await new Promise((resolve) => setTimeout(resolve, 600));
  fireEvent.mouseUp(element, { button: 0 });
}

function typeAmount(digits: string) {
  for (const digit of digits) press(digit);
}

describe('onboarding', () => {
  it('saves the chosen currency and week start, then opens the app', async () => {
    const store = await freshStore({ onboarded: false });
    renderWith(store, <Root />);

    fireEvent.click(await screen.findByRole('tab', { name: '$ Dólares' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Domingo' }));
    press('Empezar');

    expect(await screen.findByRole('heading', { name: 'Registro' })).toBeTruthy();
    expect(await store.settings()).toEqual({ onboarded: true, currency: 'USD', weekStart: 0 });
  });
});

describe('entry', () => {
  it('records an expense with the amount, a note and a category', async () => {
    const store = await freshStore();
    renderWith(store, <Root />);

    fireEvent.click(await screen.findByRole('button', { name: 'Agregar' }));
    typeAmount('18');
    press('Confirmar');

    fireEvent.change(screen.getByPlaceholderText('Nota (opcional)'), {
      target: { value: ' Menú ' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Comida' }));

    expect(await screen.findByRole('button', { name: 'Menú' })).toBeTruthy();

    const [saved] = await store.transactions();
    expect(saved).toMatchObject({
      kind: 'expense',
      amount: 1800,
      categoryId: 'food',
      note: 'Menú',
    });
  });

  it('deletes a transaction after a long press and a confirmation', async () => {
    const store = await freshStore();
    await store.addTransaction({
      kind: 'expense',
      amount: 500,
      categoryId: 'transport',
      note: '',
      at: Date.now(),
    });
    renderWith(store, <Root />);

    await longPress(await screen.findByRole('button', { name: 'Transporte' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));

    await waitFor(async () => expect(await store.transactions()).toEqual([]));
    expect(await screen.findByText('Aún no hay movimientos')).toBeTruthy();
  });
});

describe('budgets', () => {
  it('creates a monthly budget for one category', async () => {
    const store = await freshStore();
    renderWith(store, <Root />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Presupuestos' }));
    press('Crear presupuesto');
    fireEvent.click(screen.getByRole('radio', { name: 'Comida' }));
    typeAmount('300');
    press('Confirmar');

    expect(await screen.findByRole('button', { name: 'Comida' })).toBeTruthy();
    expect(await store.budgets()).toMatchObject([
      { categoryId: 'food', amount: 30000, period: 'month' },
    ]);
  });
});
