import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time for rendering. Every view that reads it works by the day, so
 * it refreshes at local midnight and when the app returns to the foreground,
 * and holds no timer while the app is in the background.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stop = () => clearTimeout(timer);

    const tick = () => {
      // Resuming on the same day keeps the old value, so nothing re-renders.
      const current = new Date();
      setNow((previous) => (sameDay(previous, current) ? previous : current));

      stop();
      timer = setTimeout(tick, untilMidnight(current));
    };

    if (AppState.currentState === 'active' || AppState.currentState == null) {
      timer = setTimeout(tick, untilMidnight(new Date()));
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

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Milliseconds until the next local midnight, plus one second of margin. */
export function untilMidnight(from: Date): number {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  return next.getTime() - from.getTime() + 1000;
}
