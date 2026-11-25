import { beforeEach, describe, expect, it } from '@jest/globals';
import { screen, userEvent, waitFor, within } from '@testing-library/react-native';
import { Shell } from '../src/Shell';
import { recorderOf } from './native';
import { freshStore, renderWith } from './render';

// The native scheduler behind expo-notifications. jest-expo stands it in with
// a recorder, so these are the calls the OS alarm queue would receive.
const scheduler = recorderOf<'scheduleNotificationAsync' | 'cancelAllScheduledNotificationsAsync'>(
  'expo-notifications',
  'NotificationScheduler'
);

const minute = 60_000;

beforeEach(() => {
  scheduler.scheduleNotificationAsync.mockClear();
  scheduler.cancelAllScheduledNotificationsAsync.mockClear();
});

describe('a focus session', () => {
  it('starts with a task and a timebox, and schedules the chimes for it', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await renderWith(store, <Shell />);

    await user.press(await screen.findByRole('button', { name: 'Empezar' }));
    await user.type(screen.getByLabelText('Tarea'), 'correo');
    await user.press(
      within(screen.getByLabelText('Tiempo previsto')).getByRole('tab', {
        name: '25 min',
      })
    );
    await user.press(screen.getByRole('button', { name: 'Listo' }));

    expect(await screen.findByText('correo')).toBeOnTheScreen();
    expect(await store.settings()).toMatchObject({
      active: true,
      focus: { label: 'correo', budget: 25 },
    });

    await waitFor(() => expect(scheduler.scheduleNotificationAsync).toHaveBeenCalledTimes(60));

    const [, content, trigger] = scheduler.scheduleNotificationAsync.mock.calls[0] ?? [];
    expect(content).toMatchObject({ title: expect.stringMatching(/^Son las \d+:\d\d$/) });
    expect(trigger).toMatchObject({ type: 'date', channelId: 'chime' });
  });

  it('stops, and leaves no chime pending', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await store.updateSettings({ active: true, focus: { label: '', budget: null, since: 0 } });
    await renderWith(store, <Shell />);

    scheduler.cancelAllScheduledNotificationsAsync.mockClear();
    scheduler.scheduleNotificationAsync.mockClear();
    await user.press(await screen.findByRole('button', { name: 'Detener' }));

    expect(await screen.findByRole('button', { name: 'Empezar' })).toBeOnTheScreen();
    await waitFor(() => expect(scheduler.cancelAllScheduledNotificationsAsync).toHaveBeenCalled());
    expect(scheduler.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect((await store.settings()).active).toBe(false);
  });

  it('saves a new interval', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await renderWith(store, <Shell />);

    const every = await screen.findByLabelText('Cada');
    await user.press(within(every).getByRole('tab', { name: '10 min' }));

    await waitFor(async () => expect((await store.settings()).interval).toBe(10));
  });

  it('opens the workday schedule when Horario turns on', async () => {
    const user = userEvent.setup();
    const store = await freshStore();
    await renderWith(store, <Shell />);

    await user.press(await screen.findByRole('switch', { name: 'Horario' }));

    expect(await screen.findByRole('checkbox', { name: 'Lunes' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Sábado' })).not.toBeChecked();

    await user.press(screen.getByRole('checkbox', { name: 'Sábado' }));

    await waitFor(async () =>
      expect((await store.settings()).schedule?.days).toEqual([1, 2, 3, 4, 5, 6])
    );
  });
});

describe('today', () => {
  it('lists what the day was spent on', async () => {
    const user = userEvent.setup();
    const clock = { at: Date.now() - 90 * minute };
    const store = await freshStore({ now: () => clock.at });

    await store.record('start', 'correo');
    clock.at += 30 * minute;
    await store.record('switch', 'informe');
    clock.at += 45 * minute;
    await store.record('stop');

    await renderWith(store, <Shell />);
    await user.press(await screen.findByRole('tab', { name: 'Hoy' }));

    expect(await screen.findByText('correo')).toBeOnTheScreen();
    expect(screen.getByText('30 min')).toBeOnTheScreen();
    expect(screen.getByText('informe')).toBeOnTheScreen();
    expect(screen.getByText('45 min')).toBeOnTheScreen();
  });
});
