import type { Every, Recurring } from './model';

/**
 * The time of a rule's occurrence `index`, counting the first as 0. Each one
 * is built from `start` and its calendar fields, so a monthly rule that starts
 * on the 31st falls on the last day of shorter months and returns to the 31st,
 * and the time of day survives a daylight-saving change.
 */
export function occurrenceAt(start: number, every: Every, index: number): number {
  const from = new Date(start);
  const year = from.getFullYear();
  const month = from.getMonth();
  const date = from.getDate();
  const time = [
    from.getHours(),
    from.getMinutes(),
    from.getSeconds(),
    from.getMilliseconds(),
  ] as const;

  if (every === 'day') return new Date(year, month, date + index, ...time).getTime();
  if (every === 'week') return new Date(year, month, date + index * 7, ...time).getTime();

  const months = every === 'month' ? index : index * 12;
  const lastDay = new Date(year, month + months + 1, 0).getDate();

  return new Date(year, month + months, Math.min(date, lastDay), ...time).getTime();
}

/** The indexes from `from` on whose occurrence falls at or before `now`. */
export function dueIndexes(
  rule: Pick<Recurring, 'start' | 'every'>,
  from: number,
  now: number
): number[] {
  const due: number[] = [];

  for (let index = from; occurrenceAt(rule.start, rule.every, index) <= now; index += 1) {
    due.push(index);
  }

  return due;
}

/** The next occurrence after `now`. */
export function nextOccurrence(rule: Pick<Recurring, 'start' | 'every'>, now: number): number {
  let index = 0;

  while (occurrenceAt(rule.start, rule.every, index) <= now) index += 1;

  return occurrenceAt(rule.start, rule.every, index);
}

/**
 * The id of a rule's occurrence. Every device derives the same one, so two
 * devices that record an occurrence write the same transaction.
 */
export function occurrenceId(ruleId: string, index: number): string {
  return `repeat:${ruleId}:${index}`;
}
