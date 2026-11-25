import type { Store } from '@atomic/core';
import { tints } from '@atomic/ui';
import { describe, expect, it } from '@jest/globals';
import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import { Root } from '../src/Root';
import { emojiAfter } from '../src/categories/CategoryForm';
import { freshStore, renderWith } from './render';

type User = ReturnType<typeof userEvent.setup>;

/** The footer under archived categories, shown only while there are some. */
const archivedNote = 'Sus movimientos se conservan, pero no aparecen al registrar.';

async function openCategories(store: Store): Promise<User> {
  const user = userEvent.setup();

  await renderWith(store, <Root />);
  await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
  await user.press(screen.getByRole('button', { name: 'Categorías' }));

  return user;
}

/** Opens the entry form and reaches its category step with any amount. */
async function pickCategory(user: User) {
  // The dim behind a sheet is out of a screen reader's reach, but a finger taps it.
  await user.press(screen.getByRole('button', { name: 'Cerrar', hidden: true }));
  await user.press(screen.getByRole('tab', { name: 'Registro' }));
  await user.press(await screen.findByRole('button', { name: 'Agregar' }));
  await user.press(screen.getByRole('button', { name: '5' }));
  await user.press(screen.getByRole('button', { name: 'Confirmar' }));
}

describe('managing categories', () => {
  it('adds an expense category and offers it when recording', async () => {
    const store = await freshStore();
    const user = await openCategories(store);

    await user.press(screen.getByRole('button', { name: 'Nueva categoría' }));
    // An emoji keyboard inserts the whole emoji in one change, after what the field held.
    fireEvent.changeText(screen.getByLabelText('Emoji'), '🏷️🐶');
    await user.type(screen.getByLabelText('Nombre'), 'Mascotas');
    await user.press(screen.getByRole('radio', { name: 'Morado' }));
    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Categoría guardada')).toBeOnTheScreen();
    expect(await store.categories()).toContainEqual(
      expect.objectContaining({
        name: 'Mascotas',
        emoji: '🐶',
        color: tints.purple,
        kind: 'expense',
      })
    );

    await pickCategory(user);

    expect(await screen.findByRole('radio', { name: 'Mascotas' })).toBeOnTheScreen();
  });

  it('does not save a category without a name', async () => {
    const store = await freshStore();
    const user = await openCategories(store);
    const before = await store.categories();

    await user.press(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByLabelText('Nombre'), '   ');
    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(await store.categories()).toEqual(before);
  });

  it('renames an income category', async () => {
    const store = await freshStore();
    const user = await openCategories(store);

    await user.press(screen.getByRole('tab', { name: 'Ingresos' }));
    await user.press(screen.getByRole('button', { name: 'Freelance' }));
    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Proyectos');
    await user.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('button', { name: 'Proyectos' })).toBeOnTheScreen();
    expect(await store.categories()).toContainEqual(
      expect.objectContaining({ id: 'freelance', name: 'Proyectos', kind: 'income' })
    );
  });

  it('archives a category, which leaves the entry picker but keeps its transactions', async () => {
    const store = await freshStore();
    await store.addTransaction({
      kind: 'expense',
      amount: 900,
      categoryId: 'travel',
      note: '',
      at: Date.now(),
    });
    const user = await openCategories(store);

    await user.press(screen.getByRole('button', { name: 'Viajes' }));
    await user.press(screen.getByRole('button', { name: 'Archivar' }));

    expect(await screen.findByText('Categoría archivada')).toBeOnTheScreen();
    expect(screen.getByText(archivedNote)).toBeOnTheScreen();
    expect(await store.transactions()).toMatchObject([{ categoryId: 'travel' }]);

    await pickCategory(user);

    expect(screen.getByRole('radio', { name: 'Comida' })).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Viajes' })).not.toBeOnTheScreen();
  });

  it('restores an archived category', async () => {
    const store = await freshStore();
    const travel = (await store.categories()).find((category) => category.id === 'travel')!;
    await store.updateCategory({ ...travel, archived: true });
    const user = await openCategories(store);

    await user.press(screen.getByRole('button', { name: 'Viajes' }));
    await user.press(screen.getByRole('button', { name: 'Restaurar' }));

    expect(await screen.findByText('Categoría restaurada')).toBeOnTheScreen();
    expect(screen.queryByText(archivedNote)).not.toBeOnTheScreen();
    expect(await store.categories()).toContainEqual(
      expect.objectContaining({ id: 'travel', archived: false })
    );
  });

  it('keeps the last active category of a kind', async () => {
    const store = await freshStore();
    const income = (await store.categories()).filter((category) => category.kind === 'income');

    for (const category of income.slice(1)) {
      // oxlint-disable-next-line no-await-in-loop
      await store.updateCategory({ ...category, archived: true });
    }

    const user = await openCategories(store);

    await user.press(screen.getByRole('tab', { name: 'Ingresos' }));
    await user.press(screen.getByRole('button', { name: income[0]!.name }));

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Archivar' })).not.toBeOnTheScreen();
  });
});

describe('emojiAfter', () => {
  it('takes the emoji a keyboard inserts and ignores plain text', () => {
    expect(emojiAfter('🏷️', '🏷️🐶')).toBe('🐶');
    expect(emojiAfter('🏷️', '🐶')).toBe('🐶');
    expect(emojiAfter('🏷️', '🏷️a')).toBe('🏷️');
    expect(emojiAfter('🏷️', '')).toBe('🏷️');
    expect(emojiAfter('🍔', '🍔👨‍👩‍👧')).toBe('👨‍👩‍👧');
  });
});
