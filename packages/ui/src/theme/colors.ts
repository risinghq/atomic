export type ColorScheme = 'light' | 'dark';

export type Colors = {
  /** Screen background. Dark mode is pure black. */
  background: string;
  /** Cards, keys and filled controls on `background`. */
  surface: string;
  /** Background of grouped lists and the sheets that hold them. */
  surfaceGrouped: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
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
    surfaceGrouped: '#FBFBFB',
    text: '#010101',
    textMuted: '#A6A6A6',
    textFaint: '#C7C7CC',
    border: '#ECF0F4',
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
    surfaceGrouped: '#1C1C1E',
    text: '#FFFFFF',
    textMuted: '#8E8E93',
    textFaint: '#636366',
    border: '#38383A',
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
