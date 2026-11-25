import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const minute = 60_000;

/**
 * The current time, refreshed at the turn of each minute while the app is in
 * the foreground. It holds no timer in the background.
 */
export function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stop = () => clearTimeout(timer);

    const tick = () => {
      const current = Date.now();
      setNow(current);

      stop();
      timer = setTimeout(tick, minute - (current % minute) + 50);
    };

    if (AppState.currentState === 'active' || AppState.currentState == null) {
      const current = Date.now();
      timer = setTimeout(tick, minute - (current % minute) + 50);
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
      else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, []);

  return now;
}
