const minute = 60_000;
const day = 24 * 60 * minute;

/** Days of the week as `Date#getDay` numbers them, and minutes after local midnight. */
export interface Schedule {
  days: readonly number[];
  start: number;
  end: number;
}

export interface Plan {
  interval: number;
  jitter: boolean;
  schedule: Schedule | null;
}

/** What the user said they are doing, and for how long, when the session began. */
export interface Focus {
  label: string;
  budget: number | null;
  since: number;
}

export const jitterShare = 0.4;

function localMidnight(at: number): number {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function minuteOfDay(at: number): number {
  return Math.floor((at - localMidnight(at)) / minute);
}

/** Midnight `offset` local days after `midnight`, correct across a DST change. */
function addDays(midnight: number, offset: number): number {
  const date = new Date(midnight);
  date.setDate(date.getDate() + offset);
  return date.getTime();
}

export function inSchedule(schedule: Schedule, at: number): boolean {
  const minutes = minuteOfDay(at);
  return (
    schedule.days.includes(new Date(at).getDay()) &&
    minutes >= schedule.start &&
    minutes < schedule.end
  );
}

/** The first moment at or after `at` that falls inside the schedule, or null if it has no days. */
export function nextOpening(schedule: Schedule, at: number): number | null {
  if (schedule.days.length === 0 || schedule.start >= schedule.end) return null;
  if (inSchedule(schedule, at)) return at;

  const today = localMidnight(at);

  for (let offset = 0; offset <= 7; offset += 1) {
    const midnight = addDays(today, offset);
    const opens = midnight + schedule.start * minute;

    if (opens >= at && schedule.days.includes(new Date(midnight).getDay())) return opens;
  }

  return null;
}

function nextFixed(interval: number, after: number): number {
  const midnight = localMidnight(after);
  const steps = Math.floor((after - midnight) / (interval * minute)) + 1;
  const next = midnight + steps * interval * minute;

  return next - midnight >= day ? addDays(midnight, 1) : next;
}

function nextJittered(interval: number, after: number, random: () => number): number {
  const share = 1 - jitterShare + 2 * jitterShare * random();
  const gap = Math.max(1, Math.round(interval * share));
  return Math.floor(after / minute) * minute + gap * minute;
}

/**
 * The next `count` chime times after `from`. Fixed intervals land on the clock
 * (every 5 minutes means :00, :05, :10); jittered ones vary each gap by up to
 * `jitterShare` either way. With a schedule, chimes fall only inside it.
 */
export function chimeTimes(
  plan: Plan,
  from: number,
  count: number,
  random: () => number = Math.random
): number[] {
  const times: number[] = [];
  let at = from;

  while (times.length < count) {
    const next = plan.jitter
      ? nextJittered(plan.interval, at, random)
      : nextFixed(plan.interval, at);
    const fits = plan.schedule ? fitSchedule(plan, plan.schedule, next) : next;

    if (fits === null) break;

    times.push(fits);
    at = fits;
  }

  return times;
}

/** Moves a chime into the schedule; null when no window can hold one within a week. */
function fitSchedule(plan: Plan, schedule: Schedule, at: number): number | null {
  let next = at;

  for (let tries = 0; tries < 8; tries += 1) {
    if (inSchedule(schedule, next)) return next;

    const opens = nextOpening(schedule, next);
    if (opens === null) return null;

    next = plan.jitter ? opens : nextFixed(plan.interval, opens - 1);
  }

  return null;
}

export function clockTime(at: number): string {
  const date = new Date(at);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Whole minutes from `since` to `at`. */
export function elapsed(since: number, at: number): number {
  return Math.max(0, Math.floor((at - since) / minute));
}

export function overBudget(focus: Focus, at: number): boolean {
  return focus.budget !== null && elapsed(focus.since, at) > focus.budget;
}

export interface Chime {
  at: number;
  title: string;
  body: string;
  /** The title and body as a voice reads them, with units in full. */
  spoken: string;
  over: boolean;
}

/** The notification a chime at `at` shows. */
export function chimeFor(at: number, focus: Focus | null): Chime {
  const title = `Son las ${clockTime(at)}`;
  const { body, over } = progress(at, focus, () => 'min');
  const spoken = `${title}. ${progress(at, focus, (count) => (count === 1 ? 'minuto' : 'minutos')).body}`;

  return { at, title, body, spoken, over };
}

function progress(
  at: number,
  focus: Focus | null,
  unit: (count: number) => string
): { body: string; over: boolean } {
  if (!focus) return { body: '¿Sigues en lo que querías hacer?', over: false };

  const spent = elapsed(focus.since, at);
  const what = focus.label === '' ? '' : ` en ${focus.label}`;

  if (focus.budget === null) return { body: `${spent} ${unit(spent)}${what}`, over: false };

  if (spent <= focus.budget) {
    return { body: `${spent} de ${focus.budget} ${unit(focus.budget)}${what}`, over: false };
  }

  const extra = spent - focus.budget;
  return { body: `${extra} ${unit(extra)} más de lo previsto${what}`, over: true };
}
