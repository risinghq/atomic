import { describe, expect, it } from '@jest/globals';
import type { EventKind, FocusEvent } from '../src/data/store';
import { timeline } from '../src/timeline';

const minute = 60_000;
let next = 0;
const event = (at: number, kind: EventKind, label = ''): FocusEvent => ({
  id: `e${++next}`,
  at: at * minute,
  kind,
  label,
});

describe('timeline', () => {
  it('splits the day at each switch', () => {
    const events = [
      event(10, 'start', 'correo'),
      event(22, 'switch', 'informe'),
      event(40, 'stop'),
    ];

    expect(timeline(null, events, 0, 60 * minute)).toEqual([
      { label: 'correo', from: 10 * minute, to: 22 * minute, running: false },
      { label: 'informe', from: 22 * minute, to: 40 * minute, running: false },
    ]);
  });

  it('carries a session running before the day began', () => {
    const before = event(-30, 'start', 'lectura');

    expect(timeline(before, [event(5, 'stop')], 0, 60 * minute)).toEqual([
      { label: 'lectura', from: 0, to: 5 * minute, running: false },
    ]);
  });

  it('runs an open session to the end of the range', () => {
    expect(timeline(null, [event(50, 'start')], 0, 60 * minute)).toEqual([
      { label: '', from: 50 * minute, to: 60 * minute, running: true },
    ]);
  });

  it('shows nothing for a stopped session', () => {
    expect(timeline(event(-5, 'stop'), [], 0, 60 * minute)).toEqual([]);
  });
});
