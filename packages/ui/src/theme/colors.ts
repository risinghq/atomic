export type ColorScheme = 'light' | 'dark';

export type Colors = {
  /** Screen background. Dark mode is pure black. */
  background: string;
  /** Cards, keys and filled controls on `background`. */
  surface: string;
  /** Grouped list sections and cards that sit on `background`. */
  card: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  /** The empty part of a toggle, progress bar or chart bar. */
  track: string;
  /** A control lifted off `surface`, such as the selected segment. */
  raised: string;
  /** The primary action fill, such as the add button and the confirm key. */
  accent: string;
  onAccent: string;
  icon: string;
  iconMuted: string;
  income: string;
  incomeMuted: string;
  progress: string;
  progressMuted: string;
  warning: string;
  danger: string;
  dangerMuted: string;
  overBudget: string;
};

export const palettes: Record<ColorScheme, Colors> = {
  light: {
    background: '#FFFFFF',
    surface: '#F6F6F6',
    card: '#F7F7F7',
    text: '#010101',
    textMuted: '#A6A6A6',
    textFaint: '#C7C7CC',
    border: '#ECF0F4',
    track: '#E9E9EB',
    raised: '#FFFFFF',
    accent: '#3C3C3C',
    onAccent: '#FFFFFF',
    icon: '#3D3D3D',
    iconMuted: 'rgba(218, 218, 218, 0.55)',
    income: '#03CD86',
    incomeMuted: '#E6FAF2',
    progress: '#34E15B',
    progressMuted: '#EEFDF3',
    warning: '#FDCC41',
    danger: '#FE473A',
    dangerMuted: '#FFF2F0',
    overBudget: '#F17879',
  },
  dark: {
    background: '#000000',
    surface: '#2C2C2E',
    card: '#1C1C1E',
    text: '#FFFFFF',
    textMuted: '#8E8E93',
    textFaint: '#636366',
    border: '#38383A',
    track: '#39393D',
    raised: '#636366',
    accent: '#FFFFFF',
    onAccent: '#1C1C1E',
    icon: '#FBFBFB',
    iconMuted: 'rgba(118, 118, 128, 0.36)',
    income: '#0FFFA9',
    incomeMuted: '#12302A',
    progress: '#76EC95',
    progressMuted: '#1D3021',
    warning: '#FDCC41',
    danger: '#FE473A',
    dangerMuted: '#3A1D1A',
    overBudget: '#F17879',
  },
};

/**
 * Fills for category tiles and chart segments. They read on both schemes, so
 * they do not change with it.
 */
export const tints = {
  red: '#FF6B5E',
  orange: '#FF9F43',
  yellow: '#FDCC41',
  green: '#34D399',
  teal: '#2DD4BF',
  blue: '#4F8EF7',
  indigo: '#7C83FD',
  purple: '#B57BFF',
  pink: '#FF6FAE',
  grey: '#A6A6A6',
} as const;

export type Tint = keyof typeof tints;

/** A `#RRGGBB` color at the given opacity, as `rgba()`. Other forms pass through. */
export function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return color;

  const value = Number.parseInt(match[1] ?? '', 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
