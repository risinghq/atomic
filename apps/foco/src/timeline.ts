import type { FocusEvent } from './data/store';

/** A stretch of time spent on one thing. */
export interface Segment {
  label: string;
  from: number;
  to: number;
  /** Still going at the end of the range. */
  running: boolean;
}

/**
 * Splits `from`..`to` into what the person was doing. `before` is the last
 * event ahead of `from`, so a session running at midnight opens the day.
 */
export function timeline(
  before: FocusEvent | null,
  events: readonly FocusEvent[],
  from: number,
  to: number
): Segment[] {
  const segments: Segment[] = [];
  let open: Segment | null =
    before && before.kind !== 'stop' ? { label: before.label, from, to, running: false } : null;

  function close(at: number, running = false) {
    if (open && at > open.from) segments.push({ ...open, to: at, running });
    open = null;
  }

  for (const event of events) {
    close(event.at);

    if (event.kind !== 'stop') open = { label: event.label, from: event.at, to, running: false };
  }

  close(to, true);

  return segments;
}
