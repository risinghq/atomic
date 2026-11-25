// One subpath per weight: the package index requires all 18 font files.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import type { TextStyle } from 'react-native';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

const interFamily: Record<FontWeight, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

/** Pass to `useFonts` from expo-font before rendering any text. */
export const fontAssets = {
  [interFamily.regular]: Inter_400Regular,
  [interFamily.medium]: Inter_500Medium,
  [interFamily.semibold]: Inter_600SemiBold,
  [interFamily.bold]: Inter_700Bold,
};

/**
 * Every platform draws Inter, one bundled family per weight. The style sets no
 * `fontWeight`: Android would ignore the family, and a browser would
 * synthesize bold over the registered face.
 */
export function font(weight: FontWeight): TextStyle {
  return { fontFamily: interFamily[weight] };
}

/**
 * Inter's recommended tracking for a size, in points: about zero at 12 and
 * tighter as the size grows, which keeps large amounts compact.
 * https://rsms.me/inter/dynmetrics/
 */
export function tracking(fontSize: number): number {
  const em = -0.0223 + 0.185 * Math.exp(-0.1745 * fontSize);

  return Math.round(em * fontSize * 100) / 100;
}

export type TextVariant =
  | 'hero'
  | 'display'
  | 'amount'
  | 'largeTitle'
  | 'title'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subheadline'
  | 'footnote'
  | 'caption'
  | 'caption2';

type VariantSpec = { fontSize: number; lineHeight: number; weight: FontWeight };

/**
 * Sizes follow the iOS default Dynamic Type scale, as Dime's do. The first
 * three are for money: `hero` is the month's total, `display` the amount being
 * typed, `amount` a total inside a card.
 */
export const textVariants: Record<TextVariant, VariantSpec> = {
  hero: { fontSize: 65, lineHeight: 72, weight: 'regular' },
  display: { fontSize: 56, lineHeight: 64, weight: 'regular' },
  amount: { fontSize: 34, lineHeight: 41, weight: 'medium' },
  largeTitle: { fontSize: 34, lineHeight: 41, weight: 'bold' },
  title: { fontSize: 28, lineHeight: 34, weight: 'bold' },
  title2: { fontSize: 22, lineHeight: 28, weight: 'semibold' },
  title3: { fontSize: 20, lineHeight: 25, weight: 'semibold' },
  headline: { fontSize: 17, lineHeight: 22, weight: 'semibold' },
  body: { fontSize: 17, lineHeight: 22, weight: 'regular' },
  callout: { fontSize: 16, lineHeight: 21, weight: 'regular' },
  subheadline: { fontSize: 15, lineHeight: 20, weight: 'regular' },
  footnote: { fontSize: 13, lineHeight: 18, weight: 'regular' },
  caption: { fontSize: 12, lineHeight: 16, weight: 'regular' },
  caption2: { fontSize: 11, lineHeight: 13, weight: 'regular' },
};

export function textStyle(variant: TextVariant, weight?: FontWeight): TextStyle {
  const spec = textVariants[variant];

  return {
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: tracking(spec.fontSize),
    ...font(weight ?? spec.weight),
  };
}

/** Digits of equal width, so amounts line up and do not jitter as they change. */
export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
