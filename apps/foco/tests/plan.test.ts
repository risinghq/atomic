import { describe, expect, it } from '@jest/globals';
import { chimeFor, chimeTimes, clockTime, nextOpening, type Plan } from '../src/plan';

// The test script pins TZ to America/Lima, which keeps no daylight saving time.
const at = (text: string) => new Date(text).getTime();
const clocks = (times: number[]) => times.map(clockTime);
const workdays = { days: [1, 2, 3, 4, 5], start: 9 * 60, end: 18 * 60 };

describe('chimeTimes', () => {
  const every5: Plan = { interval: 5, jitter: false, schedule: null };

  it('lands fixed intervals on the clock', () => {
    expect(clocks(chimeTimes(every5, at('2026-11-23T10:32:41'), 3))).toEqual([
      '10:35',
      '10:40',
      '10:45',
    ]);
  });

  it('skips a chime that falls exactly now', () => {
    expect(clocks(chimeTimes(every5, at('2026-11-23T10:35:00'), 1))).toEqual(['10:40']);
  });

  it('crosses midnight', () => {
    const every25 = { ...every5, interval: 25 };
    expect(clocks(chimeTimes(every25, at('2026-11-23T23:40:00'), 3))).toEqual([
      '23:45',
      '0:00',
      '0:25',
    ]);
  });

  it('keeps jittered gaps within 40 percent of the interval', () => {
    const jittered = { interval: 10, jitter: true, schedule: null };
    const lowest = chimeTimes(jittered, at('2026-11-23T10:00:00'), 2, () => 0);
    const highest = chimeTimes(jittered, at('2026-11-23T10:00:00'), 2, () => 0.999);

    expect(clocks(lowest)).toEqual(['10:06', '10:12']);
    expect(clocks(highest)).toEqual(['10:14', '10:28']);
  });

  it('holds chimes inside the schedule', () => {
    const plan = { ...every5, interval: 30, schedule: workdays };
    const friday = at('2026-11-27T17:10:00');

    expect(clocks(chimeTimes(plan, friday, 3))).toEqual(['17:30', '9:00', '9:30']);
    expect(new Date(chimeTimes(plan, friday, 2)[1] ?? 0).getDay()).toBe(1);
  });

  it('opens a jittered schedule at its start', () => {
    const plan = { interval: 10, jitter: true, schedule: workdays };
    expect(clocks(chimeTimes(plan, at('2026-11-23T07:00:00'), 1, () => 0.5))).toEqual(['9:00']);
  });

  it('gives up on a window too short for an aligned chime', () => {
    const plan = { ...every5, interval: 25, schedule: { days: [1], start: 541, end: 545 } };
    expect(chimeTimes(plan, at('2026-11-23T07:00:00'), 3)).toEqual([]);
  });
});

describe('nextOpening', () => {
  it('is null for a schedule with no days', () => {
    expect(nextOpening({ ...workdays, days: [] }, at('2026-11-23T07:00:00'))).toBeNull();
  });

  it('is the same moment inside the schedule', () => {
    const now = at('2026-11-23T11:00:00');
    expect(nextOpening(workdays, now)).toBe(now);
  });
});

describe('chimeFor', () => {
  const since = at('2026-11-23T10:00:00');

  it('asks a plain question with no focus', () => {
    expect(chimeFor(at('2026-11-23T10:05:00'), null)).toEqual({
      at: at('2026-11-23T10:05:00'),
      title: 'Son las 10:05',
      body: '¿Sigues en lo que querías hacer?',
      over: false,
    });
  });

  it('counts minutes spent on the focus', () => {
    const focus = { label: 'correo', budget: null, since };
    expect(chimeFor(at('2026-11-23T10:12:30'), focus).body).toBe('12 min en correo');
  });

  it('counts against a timebox', () => {
    const focus = { label: 'correo', budget: 25, since };
    expect(chimeFor(at('2026-11-23T10:12:00'), focus).body).toBe('12 de 25 min en correo');
    expect(chimeFor(at('2026-11-23T10:25:00'), focus).over).toBe(false);
  });

  it('escalates once the timebox is spent', () => {
    const focus = { label: '', budget: 25, since };
    expect(chimeFor(at('2026-11-23T10:40:00'), focus)).toMatchObject({
      body: '15 min más de lo previsto',
      over: true,
    });
  });
});
