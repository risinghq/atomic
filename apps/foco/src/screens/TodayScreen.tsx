import { EmptyState, ListRow, ListSection } from '@rising/ui';
import { useEffect, useState } from 'react';
import { Screen } from '../components/Screen';
import { useFoco } from '../data/FocoProvider';
import { clockTime, elapsed } from '../plan';
import { timeline, type Segment } from '../timeline';
import { useMinute } from '../useMinute';

function startOfDay(at: number): number {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Today's stretches of focus, oldest first, and the minutes each took. */
export function TodayScreen() {
  const { store, lastChange } = useFoco();
  const minute = useMinute();
  const [segments, setSegments] = useState<Segment[] | null>(null);

  useEffect(() => {
    let current = true;
    // The clock ticks once a minute, so an event recorded since is later than it.
    const now = Math.max(minute, lastChange);
    const from = startOfDay(now);

    void Promise.all([store.lastEventBefore(from), store.events(from, now + 1)]).then(
      ([before, events]) => {
        if (current) setSegments(timeline(before, events, from, now));
      }
    );

    return () => {
      current = false;
    };
  }, [store, lastChange, minute]);

  if (!segments) return <Screen title="Hoy">{null}</Screen>;

  const total = segments.reduce((sum, segment) => sum + elapsed(segment.from, segment.to), 0);

  return (
    <Screen title="Hoy">
      {segments.length === 0 ? (
        <EmptyState
          emoji="🕰️"
          title="Nada todavía"
          message="Cuando empieces, aquí verás en qué se fue tu día."
        />
      ) : (
        <ListSection title="Tu día" footer={`${total} min con avisos`}>
          {segments.map((segment) => (
            <ListRow
              key={segment.from}
              title={segment.label || 'Sin tarea'}
              subtitle={`${clockTime(segment.from)} – ${segment.running ? 'ahora' : clockTime(segment.to)}`}
              value={`${elapsed(segment.from, segment.to)} min`}
            />
          ))}
        </ListSection>
      )}
    </Screen>
  );
}
