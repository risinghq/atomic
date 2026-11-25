import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const MINUTE = 60 * 1000;

/**
 * The current time for rendering. It refreshes each minute and when the app
 * returns to the foreground, so "Hoy" and the budget days follow the clock.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, MINUTE);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return now;
}
