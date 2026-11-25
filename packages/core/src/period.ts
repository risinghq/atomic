import type { WeekStart } from './model';

/** A half-open time range: `start` is inside it, `end` is not. */
export type Span = { start: Date; end: Date };

export type PeriodKind = 'week' | 'month' | 'year';

export type Period = Span & { kind: PeriodKind };

// Dates are built from calendar fields, never by adding milliseconds, so a
// day stays a calendar day across a daylight-saving change.
function day(year: number, month: number, date: number): Date {
  return new Date(year, month, date);
}

/** The week, month or year that contains `at`, in local time. */
export function periodOf(kind: PeriodKind, at: Date, weekStart: WeekStart = 1): Period {
  const year = at.getFullYear();
  const month = at.getMonth();

  if (kind === 'year') {
    return { kind, start: day(year, 0, 1), end: day(year + 1, 0, 1) };
  }

  if (kind === 'month') {
    return { kind, start: day(year, month, 1), end: day(year, month + 1, 1) };
  }

  const back = (at.getDay() - weekStart + 7) % 7;
  const start = day(year, month, at.getDate() - back);

  return { kind, start, end: day(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
}

/** The period `steps` periods after this one; negative steps go back. */
export function shiftPeriod(period: Period, steps: number): Period {
  const { kind, start } = period;
  const year = start.getFullYear();
  const month = start.getMonth();

  if (kind === 'year') {
    return { kind, start: day(year + steps, 0, 1), end: day(year + steps + 1, 0, 1) };
  }

  if (kind === 'month') {
    return { kind, start: day(year, month + steps, 1), end: day(year, month + steps + 1, 1) };
  }

  const first = start.getDate() + steps * 7;

  return { kind, start: day(year, month, first), end: day(year, month, first + 7) };
}

export function contains(span: Span, at: number | Date): boolean {
  const time = typeof at === 'number' ? at : at.getTime();

  return time >= span.start.getTime() && time < span.end.getTime();
}

export function samePeriod(a: Period, b: Period): boolean {
  return a.kind === b.kind && a.start.getTime() === b.start.getTime();
}

/** How much of the span has passed at `now`, from 0 to 1. */
export function elapsedShare(span: Span, now: number | Date): number {
  const time = typeof now === 'number' ? now : now.getTime();
  const share = (time - span.start.getTime()) / (span.end.getTime() - span.start.getTime());

  return Math.min(1, Math.max(0, share));
}

/** The bars of a chart over the period: its days, or a year's months. */
export function bucketsOf(period: Period): Span[] {
  const { kind, start, end } = period;
  const year = start.getFullYear();
  const month = start.getMonth();
  const buckets: Span[] = [];

  if (kind === 'year') {
    for (let index = 0; index < 12; index += 1) {
      buckets.push({ start: day(year, index, 1), end: day(year, index + 1, 1) });
    }

    return buckets;
  }

  for (let date = start.getDate(); day(year, month, date) < end; date += 1) {
    buckets.push({ start: day(year, month, date), end: day(year, month, date + 1) });
  }

  return buckets;
}
