import { describe, expect, it } from '@jest/globals';
import { memoryDatabase } from '@rising/core/testing';
import { defaultSettings, openStore } from '../src/data/store';

async function fresh(clock = { at: 1_000 }) {
  let next = 0;
  return openStore(memoryDatabase(), { newId: () => `id-${++next}`, now: () => clock.at });
}

describe('store', () => {
  it('starts from the default settings', async () => {
    const store = await fresh();
    expect(await store.settings()).toEqual(defaultSettings);
  });

  it('keeps settings across a reopen of the same database', async () => {
    const db = memoryDatabase();
    const first = await openStore(db, { newId: () => 'a' });
    const focus = { label: 'correo', budget: 25, since: 5 };

    await first.updateSettings({ interval: 10, active: true, focus });

    const second = await openStore(db, { newId: () => 'b' });
    expect(await second.settings()).toEqual({
      ...defaultSettings,
      interval: 10,
      active: true,
      focus,
    });
  });

  it('lists events in a range, oldest first, and the last one before it', async () => {
    const clock = { at: 100 };
    const store = await fresh(clock);

    await store.record('start', 'correo');
    clock.at = 200;
    await store.record('switch', 'informe');
    clock.at = 300;
    await store.record('stop');

    expect(await store.events(150, 400)).toEqual([
      { id: 'id-2', at: 200, kind: 'switch', label: 'informe' },
      { id: 'id-3', at: 300, kind: 'stop', label: '' },
    ]);
    expect(await store.lastEventBefore(150)).toEqual({
      id: 'id-1',
      at: 100,
      kind: 'start',
      label: 'correo',
    });
  });

  it('erases everything', async () => {
    const store = await fresh();

    await store.record('start', 'correo');
    await store.updateSettings({ interval: 25 });
    await store.erase();

    expect(await store.events(0, Number.MAX_SAFE_INTEGER)).toEqual([]);
    expect(await store.settings()).toEqual(defaultSettings);
  });
});
