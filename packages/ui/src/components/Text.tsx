import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import type { Colors } from '../theme/colors';
import { tabularNumbers, textStyle, type FontWeight, type TextVariant } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';

export type ColorName = keyof Colors;

export type TextProps = NativeTextProps & {
  variant?: TextVariant;
  weight?: FontWeight;
  color?: ColorName;
  /** Equal-width digits, for amounts and times. */
  tabular?: boolean;
};

export function Text({
  variant = 'body',
  weight,
  color = 'text',
  tabular = false,
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();
  return (
    <NativeText
      {...props}
      style={[
        textStyle(variant, weight),
        { color: colors[color] },
        tabular && tabularNumbers,
        style,
      ]}
    />
  );
}
