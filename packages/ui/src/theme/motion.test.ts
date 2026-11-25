import { describe, expect, it } from 'vitest';
import { spring } from './motion';

describe('spring', () => {
  it('turns a response and damping fraction into mass, stiffness and damping', () => {
    const { mass, stiffness, damping } = spring(0.5, 1);
    expect(mass).toBe(1);
    expect(stiffness).toBeCloseTo((4 * Math.PI) ** 2);
    expect(damping).toBeCloseTo(8 * Math.PI);
  });

  it('keeps the damping ratio it was given', () => {
    const { mass, stiffness, damping } = spring(0.4, 0.85);
    expect(damping / (2 * Math.sqrt(stiffness * mass))).toBeCloseTo(0.85);
  });
});
