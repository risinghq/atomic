import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { switchAction } from './chimes';

/**
 * Calls `onSwitch` when the person answers a chime with "Cambié", whether the
 * answer launched the app or reached it while it ran.
 */
export function useSwitchRequest(onSwitch: () => void) {
  const handled = useRef<string | null>(null);
  const callback = useRef(onSwitch);
  callback.current = onSwitch;

  const last = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!last) return;

    // The last response outlives the render that delivered it; act on each once.
    const key = `${last.notification.request.identifier}:${last.actionIdentifier}`;
    if (handled.current === key) return;
    handled.current = key;

    if (last.actionIdentifier === switchAction) callback.current();
  }, [last]);
}
