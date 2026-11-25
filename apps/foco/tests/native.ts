import { jest } from '@jest/globals';
import { act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { dirname, join } from 'node:path';

export type Recorder = jest.Mock<(...args: any[]) => any>;

/**
 * The recorder jest-expo stands in for a package's native module, as the
 * package's own code holds it. Some packages hide their native file behind an
 * export map, so it is reached by path next to their entry file.
 */
export function recorderOf<Name extends string>(pkg: string, file: string): Record<Name, Recorder> {
  return require(join(dirname(require.resolve(pkg)), file)).default;
}

/**
 * Moves the app to `state`, as the system does when the person leaves or
 * returns: every live AppState listener hears it.
 */
export async function appGoes(state: AppStateStatus) {
  const addListener = AppState.addEventListener as unknown as Recorder;
  const live = addListener.mock.calls
    .map((call, index) => ({ call, subscription: addListener.mock.results[index]?.value }))
    .filter(
      ({ call, subscription }) => call[0] === 'change' && !subscription.remove.mock.calls.length
    );

  await act(async () => {
    for (const { call } of live) call[1](state);
  });
}
