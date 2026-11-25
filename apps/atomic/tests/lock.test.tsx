import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { screen, userEvent } from '@testing-library/react-native';
import { SecurityLevel } from 'expo-local-authentication';
import { LOCK_AFTER } from '../src/lock/AppLock';
import { Root } from '../src/Root';
import { appGoes, recorderOf } from './native';
import { freshStore, renderWith } from './render';

// The device's screen lock: what it holds, and the prompt it shows.
const nativeAuth = recorderOf<'getEnrolledLevelAsync' | 'authenticateAsync'>(
  'expo-local-authentication',
  'ExpoLocalAuthentication'
);

const LOCKED = 'Atomic está bloqueado';

function deviceHas(level: SecurityLevel) {
  nativeAuth.getEnrolledLevelAsync.mockResolvedValue(level);
}

function personAnswers(...answers: boolean[]) {
  for (const success of answers) {
    nativeAuth.authenticateAsync.mockResolvedValueOnce(
      success ? { success } : { success, error: 'user_cancel' }
    );
  }
}

async function lockedStore() {
  const store = await freshStore();
  await store.updateSettings({ lock: true });

  return store;
}

/** Leaves the app for `away` milliseconds, then comes back. */
async function leaveFor(away: number) {
  const left = Date.now();
  await appGoes('background');

  jest.spyOn(Date, 'now').mockReturnValue(left + away);
  await appGoes('active');
}

beforeEach(() => {
  deviceHas(SecurityLevel.BIOMETRIC_STRONG);
});

afterEach(() => {
  jest.restoreAllMocks();
  nativeAuth.authenticateAsync.mockReset();
});

describe('turning the lock on', () => {
  it('asks for the screen lock once, then keeps the app locked at the next start', async () => {
    const store = await freshStore();
    const user = userEvent.setup();
    personAnswers(true);

    await renderWith(store, <Root />);
    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('switch', { name: 'Bloquear la app' }));

    expect(nativeAuth.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(await store.settings()).toEqual(expect.objectContaining({ lock: true }));
    expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();

    await screen.unmount();
    personAnswers(true);
    await renderWith(store, <Root />);

    expect(await screen.findByRole('header', { name: 'Registro' })).toBeOnTheScreen();
    expect(nativeAuth.authenticateAsync).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
  });

  it('stays off when the device has no screen lock', async () => {
    const store = await freshStore();
    const user = userEvent.setup();
    deviceHas(SecurityLevel.NONE);

    await renderWith(store, <Root />);
    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('switch', { name: 'Bloquear la app' }));

    expect(
      await screen.findByText('Configura un bloqueo de pantalla en tu dispositivo.')
    ).toBeOnTheScreen();
    expect(nativeAuth.authenticateAsync).not.toHaveBeenCalled();
    expect(await store.settings()).toEqual(expect.objectContaining({ lock: false }));
  });

  it('stays off when the person cancels the prompt', async () => {
    const store = await freshStore();
    const user = userEvent.setup();
    personAnswers(false);

    await renderWith(store, <Root />);
    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('switch', { name: 'Bloquear la app' }));

    expect(nativeAuth.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(await store.settings()).toEqual(expect.objectContaining({ lock: false }));
  });

  it('turns off without asking', async () => {
    const store = await lockedStore();
    const user = userEvent.setup();
    personAnswers(true);

    await renderWith(store, <Root />);
    await user.press(await screen.findByRole('tab', { name: 'Ajustes' }));
    await user.press(screen.getByRole('switch', { name: 'Bloquear la app' }));

    expect(nativeAuth.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(await store.settings()).toEqual(expect.objectContaining({ lock: false }));
  });
});

describe('a locked app', () => {
  it('stays covered while the prompt fails, and opens when Desbloquear passes', async () => {
    const store = await lockedStore();
    const user = userEvent.setup();
    personAnswers(false, true);

    await renderWith(store, <Root />);

    expect(await screen.findByText(LOCKED)).toBeOnTheScreen();
    expect(nativeAuth.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'Desbloquear Atomic' })
    );

    await user.press(screen.getByRole('button', { name: 'Desbloquear' }));

    expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
    expect(nativeAuth.authenticateAsync).toHaveBeenCalledTimes(2);
  });

  it('locks again after a long absence, but not after a short one', async () => {
    const store = await lockedStore();
    personAnswers(true);

    await renderWith(store, <Root />);
    expect(await screen.findByRole('header', { name: 'Registro' })).toBeOnTheScreen();
    expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();

    await leaveFor(LOCK_AFTER - 1_000);
    expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
    expect(nativeAuth.authenticateAsync).toHaveBeenCalledTimes(1);

    personAnswers(false);
    await leaveFor(LOCK_AFTER);
    expect(await screen.findByText(LOCKED)).toBeOnTheScreen();
    expect(nativeAuth.authenticateAsync).toHaveBeenCalledTimes(2);
  });

  it('never locks when the lock is off', async () => {
    const store = await freshStore();

    await renderWith(store, <Root />);
    await screen.findByRole('header', { name: 'Registro' });
    await leaveFor(10 * LOCK_AFTER);

    expect(screen.queryByText(LOCKED)).not.toBeOnTheScreen();
    expect(nativeAuth.authenticateAsync).not.toHaveBeenCalled();
  });
});
