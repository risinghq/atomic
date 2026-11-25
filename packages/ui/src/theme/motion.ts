import { Easing } from 'react-native-reanimated';

export type PhysicsSpring = { mass: number; stiffness: number; damping: number };

/**
 * Converts a spring given as a response (seconds per undamped oscillation) and
 * a damping fraction into the mass, stiffness and damping Reanimated takes.
 * With mass 1: stiffness = (2π / response)² and damping = 4π · fraction / response.
 */
export function spring(response: number, dampingFraction: number): PhysicsSpring {
  const omega = (2 * Math.PI) / response;
  return {
    mass: 1,
    stiffness: omega * omega,
    damping: 2 * omega * dampingFraction,
  };
}

export const springs = {
  /** Presses and toggles. */
  snappy: spring(0.3, 0.8),
  /** Things that move into place: tabs, sheets, selection pills. */
  smooth: spring(0.4, 0.85),
  /** Large surfaces and layout changes. */
  gentle: spring(0.55, 0.85),
} as const;

export const durations = {
  fast: 150,
  base: 200,
  slow: 300,
} as const;

export const easings = {
  standard: Easing.inOut(Easing.ease),
  enter: Easing.out(Easing.ease),
  exit: Easing.in(Easing.ease),
} as const;

/** Scale of a pressed control. */
export const pressScale = 0.96;
