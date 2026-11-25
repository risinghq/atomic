import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { Platform, type TextStyle } from 'react-native';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

const numericWeight: Record<FontWeight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const nunitoFamily: Record<FontWeight, string> = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
};

/** Pass to `useFonts` from expo-font before rendering text on Android and web. */
export const fontAssets = {
  [nunitoFamily.regular]: Nunito_400Regular,
  [nunitoFamily.medium]: Nunito_500Medium,
  [nunitoFamily.semibold]: Nunito_600SemiBold,
  [nunitoFamily.bold]: Nunito_700Bold,
};

/**
 * iOS draws the system rounded face (SF Rounded) and picks the weight itself.
 * Android and web have no rounded system face, so they use one bundled Nunito
 * family per weight. They get no `fontWeight`: Android would ignore the family,
 * and a browser would synthesize bold over the registered face.
 */
export function font(weight: FontWeight, os: typeof Platform.OS = Platform.OS): TextStyle {
  if (os === 'ios') return { fontFamily: 'ui-rounded', fontWeight: numericWeight[weight] };
  return { fontFamily: nunitoFamily[weight] };
}

export type TextVariant =
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

/** Sizes follow the iOS default Dynamic Type scale; the first two are for money. */
export const textVariants: Record<TextVariant, VariantSpec> = {
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
    ...font(weight ?? spec.weight),
  };
}

/** Digits of equal width, so amounts line up and do not jitter as they change. */
export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
